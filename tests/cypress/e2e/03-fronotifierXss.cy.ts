import { DocumentNode } from 'graphql'

// Digitall website page where the component is placed
const WEBSITE_PATH = '/sites/digitall/home.html'

// Path under which the jnt:full_read_only_notifier node is added
const COMPONENT_PARENT = '/sites/digitall/home/footer-1'
const COMPONENT_NAME = 'fron-xss-popup'
const COMPONENT_PATH = `${COMPONENT_PARENT}/${COMPONENT_NAME}`

// Site-level settings node holding content_on / content_off
const FRONOTIFIER_PATH = '/sites/digitall/fronotifier'

// Cookie written/cleared by the JSP script
const COOKIE_NAME = 'full_read_only'

// The notification banner is appended to <body> by froShowNotification()
const BANNER = '[id="froBanner"]'

// ---------------------------------------------------------------------------
// Regression test for issue #19 — Stored XSS in the public notifier view.
//
// content_on / content_off are plain (string) JCR properties. Only the GraphQL
// mutation sanitizes them (Jsoup); a DIRECT JCR write (jContent / import / raw
// GraphQL setValue) bypasses that and stores hostile markup. The render layer
// must therefore NEVER emit the stored value into an executable context.
//
// The fix emits the value as HTML-escaped TEXT and recovers it via .textContent
// + froSanitize() before injecting it into the banner, so a <script> / <img
// onerror> payload neither executes on initial page load nor reaches the banner.
//
// These specs write the payload via the RAW JCR mutation (bypassing the
// sanitizer) and assert that no injected script ever runs.
// ---------------------------------------------------------------------------

function setFullReadOnly(enabled: boolean) {
    cy.request({
        method: 'GET',
        url: `/modules/tools/maintenance.jsp?fullReadOnlyMode=${enabled}`,
        auth: { user: 'root', pass: Cypress.env('SUPER_USER_PASSWORD') },
        failOnStatusCode: false,
    })
}

const enableReadOnly = () => setFullReadOnly(true)
const disableReadOnly = () => setFullReadOnly(false)

describe('Full Read-Only Notifier — stored XSS regression (#19)', () => {
    const siteKey = 'digitall'

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const updateFronotifierSettings: DocumentNode = require('graphql-tag/loader!../fixtures/graphql/mutation/updateFronotifierSettings.graphql')
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const setRawFronotifierProperty: DocumentNode = require('graphql-tag/loader!../fixtures/graphql/mutation/setRawFronotifierProperty.graphql')
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const addFronotifierComponent: DocumentNode = require('graphql-tag/loader!../fixtures/graphql/mutation/addFronotifierComponent.graphql')
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const deleteNode: DocumentNode = require('graphql-tag/loader!../fixtures/graphql/mutation/deleteNode.graphql')
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const publishNode: DocumentNode = require('graphql-tag/loader!../fixtures/graphql/mutation/publishNode.graphql')

    // Write a raw (unsanitized) value into content_on, then publish so the LIVE
    // page reads it. updateFronotifierSettings runs first only to guarantee the
    // /sites/digitall/fronotifier node exists before we set the property.
    function plantRawContentOn(payload: string) {
        cy.apollo({
            mutation: updateFronotifierSettings,
            variables: { siteKey, contentOff: '', contentOn: '' },
        })
        cy.apollo({
            mutation: setRawFronotifierProperty,
            variables: { path: FRONOTIFIER_PATH, property: 'content_on', value: payload },
        })
        cy.apollo({ mutation: publishNode, variables: { path: FRONOTIFIER_PATH } })
    }

    // Visit with a fresh window flag; the payload's script/onerror would set it to true.
    function visitAndAssertNoExecution() {
        cy.clearCookie(COOKIE_NAME) // cookie ABSENT => content_on branch fires
        cy.visit(WEBSITE_PATH, {
            onBeforeLoad(win) {
                ;(win as unknown as { __froXss?: boolean }).__froXss = undefined
            },
        })

        // Banner renders => the notifier script ran and processed the payload.
        cy.get(BANNER).should('be.visible')

        // Give any (broken-image) error event a chance to fire before asserting.
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        cy.wait(750)

        cy.window().should((win) => {
            expect((win as unknown as { __froXss?: boolean }).__froXss).to.be.undefined
        })

        // The banner must not contain executable surfaces either.
        cy.get(BANNER).find('script').should('not.exist')
        cy.get(BANNER)
            .find('img')
            .each(($img) => {
                expect($img.attr('onerror')).to.be.undefined
            })
    }

    before(() => {
        cy.login()

        // Best-effort cleanup of any leftover component node
        cy.request({
            method: 'POST',
            url: '/modules/graphql',
            body: {
                query: `mutation { jcr(workspace: EDIT) { mutateNode(pathOrId: "${COMPONENT_PATH}") { delete } } }`,
            },
            auth: { user: 'root', pass: Cypress.env('SUPER_USER_PASSWORD') },
            failOnStatusCode: false,
            log: false,
        })

        // Place the notifier component on the page and publish so the popup
        // script is injected into the LIVE home page.
        cy.apollo({
            mutation: addFronotifierComponent,
            variables: { parentPath: COMPONENT_PARENT, name: COMPONENT_NAME },
        })
        cy.apollo({ mutation: publishNode, variables: { path: COMPONENT_PARENT } })
    })

    afterEach(() => {
        cy.clearCookie(COOKIE_NAME)
        disableReadOnly()
    })

    after(() => {
        disableReadOnly()
        // Reset content and remove the component node
        cy.apollo({
            mutation: updateFronotifierSettings,
            variables: { siteKey, contentOff: '', contentOn: '' },
        })
        cy.apollo({ mutation: publishNode, variables: { path: FRONOTIFIER_PATH } })
        cy.apollo({ mutation: deleteNode, variables: { path: COMPONENT_PATH } })
        cy.apollo({ mutation: publishNode, variables: { path: COMPONENT_PARENT } })
    })

    it('does not execute an <img onerror> payload stored via a raw JCR write', () => {
        cy.login()
        plantRawContentOn('<p>Maintenance notice</p><img src="x" onerror="window.__froXss = true">')
        enableReadOnly()

        visitAndAssertNoExecution()

        // The benign text portion is still shown to the visitor.
        cy.get(BANNER).should('contain.text', 'Maintenance notice')
    })

    it('does not execute a <script> breakout payload stored via a raw JCR write', () => {
        cy.login()
        plantRawContentOn('<p>Hello</p></div><script>window.__froXss = true<\/script>')
        enableReadOnly()

        visitAndAssertNoExecution()

        cy.get(BANNER).should('contain.text', 'Hello')
    })
})
