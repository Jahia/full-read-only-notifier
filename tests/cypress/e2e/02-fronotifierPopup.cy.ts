import {DocumentNode} from 'graphql';
import {executeGroovy} from '@jahia/cypress';

// Digitall website page where the component will be placed
const WEBSITE_PATH = '/sites/digitall/home.html';

// Path under which the jnt:full_read_only_notifier node is added
const COMPONENT_PARENT = '/sites/digitall/home/footer-1';
const COMPONENT_NAME = 'fron-popup';
const COMPONENT_PATH = `${COMPONENT_PARENT}/${COMPONENT_NAME}`;

// Cookie written/cleared by the JSP script
const COOKIE_NAME = 'full_read_only';

// The notification banner is created dynamically by froShowNotification() as a
// fixed-position <div> appended directly to <body>
const BANNER = '[id="froBanner"]';

// ---------------------------------------------------------------------------
// Server-mode helpers
// ---------------------------------------------------------------------------

/** Put the Jahia server into full read-only mode via a Groovy provisioning script.
 *  If your Jahia version uses a different API, update the fixture files at:
 *    tests/cypress/fixtures/groovy/enableReadOnly.groovy
 *    tests/cypress/fixtures/groovy/disableReadOnly.groovy
 */
function enableReadOnly() {
    executeGroovy('groovy/enableReadOnly.groovy', {});
}

function disableReadOnly() {
    executeGroovy('groovy/disableReadOnly.groovy', {});
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe('Full Read-Only Notifier Popup', () => {
    const siteKey = 'digitall';

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const updateFronotifierSettings: DocumentNode = require('graphql-tag/loader!../fixtures/graphql/mutation/updateFronotifierSettings.graphql');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const getFronotifierSettings: DocumentNode = require('graphql-tag/loader!../fixtures/graphql/query/getFronotifierSettings.graphql');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const addFronotifierComponent: DocumentNode = require('graphql-tag/loader!../fixtures/graphql/mutation/addFronotifierComponent.graphql');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const deleteNode: DocumentNode = require('graphql-tag/loader!../fixtures/graphql/mutation/deleteNode.graphql');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const publishNode: DocumentNode = require('graphql-tag/loader!../fixtures/graphql/mutation/publishNode.graphql');

    before(() => {
        cy.login();

        // Set recognisable notification messages for this test suite
        cy.apollo({
            mutation: updateFronotifierSettings,
            variables: {
                siteKey,
                contentOff: '<p>The website is no longer in read-only mode.</p>',
                contentOn: '<p>The website is currently in <strong>read-only mode</strong>.</p>'
            }
        });

        // Remove any component node left over from a previous run (best-effort:
        // use cy.request() directly so the test does not abort if the node does
        // not yet exist and the GraphQL mutation returns an error)
        cy.request({
            method: 'POST',
            url: '/modules/graphql',
            body: {
                query: `mutation { jcr(workspace: EDIT) { mutateNode(pathOrId: "${COMPONENT_PATH}") { delete } } }`
            },
            auth: {user: 'root', pass: Cypress.env('SUPER_USER_PASSWORD')},
            failOnStatusCode: false,
            log: false
        });

        // Add the jnt:full_read_only_notifier node and publish it so the
        // popup script is injected into live pages
        cy.apollo({
            mutation: addFronotifierComponent,
            variables: {
                parentPath: COMPONENT_PARENT,
                name: COMPONENT_NAME
            }
        });

        // Ensure the server starts in normal (non-read-only) mode
        disableReadOnly();
    });

    afterEach(() => {
        cy.clearCookie(COOKIE_NAME);
    });

    after(() => {
        // Safety net: restore normal mode if a read-only test failed midway
        disableReadOnly();

        // Remove the component from the EDIT workspace and publish the
        // deletion so the live page is also cleaned up
        cy.apollo({
            mutation: deleteNode,
            variables: {path: COMPONENT_PATH}
        });
        cy.apollo({
            mutation: publishNode,
            variables: {path: COMPONENT_PARENT}
        });
    });

    // -----------------------------------------------------------------------
    // "content_off" popup — shown once when the server leaves read-only mode
    //
    // JSP branch:  renderContext.readOnlyStatus === 'OFF'
    // Trigger:     full_read_only cookie EXISTS → show popup → remove cookie
    // -----------------------------------------------------------------------

    it('shows the "off" notification after leaving read-only mode', () => {
        // Pre-set the cookie to simulate "was in read-only mode"
        cy.setCookie(COOKIE_NAME, 'Y');
        cy.visit(WEBSITE_PATH);
        cy.contains('The website is no longer in read-only mode.');
    });

    it('does not show the "off" notification when no cookie is present', () => {
        cy.visit(WEBSITE_PATH);

        cy.get(BANNER).should('not.exist');
    });

    it('removes the cookie once the "off" notification has been shown', () => {
        cy.setCookie(COOKIE_NAME, 'Y');
        cy.visit(WEBSITE_PATH);

        cy.contains('The website is no longer in read-only mode.');
        // The JSP calls removeCookie() synchronously after showing the popup
        cy.getCookie(COOKIE_NAME).should('be.null');
    });

    it('closes the "off" notification when the × button is clicked', () => {
        cy.setCookie(COOKIE_NAME, 'Y');
        cy.visit(WEBSITE_PATH);

        cy.get(BANNER).should('be.visible');
        cy.get(BANNER).find('button').click();
        cy.get(BANNER).should('not.exist');
    });

    it('does not re-show the "off" notification on the next page visit', () => {
        cy.setCookie(COOKIE_NAME, 'Y');
        cy.visit(WEBSITE_PATH);
        cy.contains('The website is no longer in read-only mode.');
        cy.get('div:nth-child(2) > button').click();
        cy.get('[id="froBanner"]').should('not.exist');
    });

    it('shows the correct configured contentOff text in the "off" notification', () => {
        cy.setCookie(COOKIE_NAME, 'Y');
        cy.visit(WEBSITE_PATH);

        cy.apollo({query: getFronotifierSettings, variables: {siteKey}})
            .its('data.fronotifierSettings.contentOff')
            .then((html: string) => {
                cy.get(BANNER).should('contain.text', html.replace(/[<>]/g, ''));
            });
    });

    // -----------------------------------------------------------------------
    // "content_on" popup — shown on first visit during read-only mode
    //
    // JSP branch:  renderContext.readOnlyStatus !== 'OFF'
    // Trigger:     full_read_only cookie ABSENT → show popup → set cookie
    // -----------------------------------------------------------------------

    it('shows the "on" notification on the first visit in read-only mode', () => {
        enableReadOnly();
        cy.visit(WEBSITE_PATH);

        cy.get(BANNER).should('be.visible');
        cy.get(BANNER).should('contain.text', 'read-only mode');

        disableReadOnly();
    });

    it('sets the cookie after showing the "on" notification', () => {
        enableReadOnly();
        cy.visit(WEBSITE_PATH);

        cy.get(BANNER).should('be.visible');
        cy.getCookie(COOKIE_NAME).should('have.property', 'value', 'Y');

        disableReadOnly();
    });

    it('does not repeat the "on" notification on subsequent visits during read-only mode', () => {
        enableReadOnly();

        // First visit: popup fires and cookie is written
        cy.visit(WEBSITE_PATH);
        cy.get(BANNER).should('be.visible');

        // Second visit: cookie suppresses the popup
        cy.visit(WEBSITE_PATH);
        cy.get(BANNER).should('not.exist');

        disableReadOnly();
    });

    it('closes the "on" notification when the × button is clicked', () => {
        enableReadOnly();
        cy.visit(WEBSITE_PATH);

        cy.get(BANNER).should('be.visible');
        cy.get(BANNER).find('button').click();
        cy.get(BANNER).should('not.exist');

        disableReadOnly();
    });

    it('shows the correct configured contentOn text in the "on" notification', () => {
        enableReadOnly();
        cy.visit(WEBSITE_PATH);

        cy.apollo({query: getFronotifierSettings, variables: {siteKey}})
            .its('data.fronotifierSettings.contentOn')
            .then((html: string) => {
                const tmp = document.createElement('div');
                tmp.innerHTML = html;
                const expectedText = tmp.textContent ?? '';
                cy.get(BANNER).should('contain.text', expectedText);
            });

        disableReadOnly();
    });
});
