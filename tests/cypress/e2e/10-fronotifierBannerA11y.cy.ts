import {
    BANNER,
    COOKIE_NAME,
    WEBSITE_PATH,
    addAndPublishComponent,
    disableReadOnly,
    publishSettingsNode,
    removeAndPublishComponent,
    writeSettings
} from '../support/fronotifierHelpers';

/**
 * U5 (Cypress half) — visitor-facing banner accessibility.
 *
 * froShowNotification() in full_read_only_notifier.jsp implements a full a11y contract
 * that no doc mentions and no existing spec asserts:
 *   role="status" + aria-live="polite", programmatic focus on show (tabindex="-1"),
 *   Escape dismisses from anywhere, the close button's accessible name comes from the
 *   server-rendered #fro-close-label element (i18n-safe), and the close button has a
 *   44x44px minimum touch target.
 *
 * All cases use the "off" banner path (cookie preset, server in normal mode) so the
 * suite never needs to toggle server modes.
 */
describe('Full Read-Only Notifier — banner accessibility', () => {
    const COMPONENT_NAME = 'fron-a11y';

    before(() => {
        cy.login();
        writeSettings('<p>The website is writable again.</p>', '<p>The website is read-only.</p>');
        publishSettingsNode();
        addAndPublishComponent(COMPONENT_NAME);
        disableReadOnly();
    });

    beforeEach(() => {
        // Preset the dedupe cookie so the "off" banner shows on visit.
        cy.setCookie(COOKIE_NAME, 'Y');
        cy.visit(WEBSITE_PATH);
        cy.get(BANNER).should('be.visible');
    });

    afterEach(() => {
        cy.clearCookie(COOKIE_NAME);
    });

    after(() => {
        disableReadOnly();
        cy.login();
        removeAndPublishComponent(COMPONENT_NAME);
    });

    it('announces politely: role="status", aria-live="polite", lang set', () => {
        cy.get(BANNER)
            .should('have.attr', 'role', 'status')
            .and('have.attr', 'aria-live', 'polite')
            .and('have.attr', 'tabindex', '-1');
        cy.get(BANNER).invoke('attr', 'lang').should('not.be.empty');
    });

    it('moves focus to the banner when it appears', () => {
        cy.focused().should('have.id', 'froBanner');
    });

    it('dismisses on Escape pressed anywhere in the document', () => {
        cy.get('body').type('{esc}');
        cy.get(BANNER).should('not.exist');
    });

    it('labels the close button from the server-rendered #fro-close-label element', () => {
        cy.get('#fro-close-label').invoke('text').then(label => {
            expect(label.trim(), 'close label must be a non-empty i18n value').to.not.be.empty;
            cy.get(BANNER).find('button')
                .should('have.attr', 'aria-label', label)
                .and('have.attr', 'title', label);
        });
    });

    it('gives the close button at least a 44x44px touch target', () => {
        cy.get(BANNER).find('button').then($button => {
            const rect = $button[0].getBoundingClientRect();
            expect(rect.width, 'close button width').to.be.at.least(44);
            expect(rect.height, 'close button height').to.be.at.least(44);
        });
    });

    it('removes the Escape listener after dismissal (Escape has no further effect)', () => {
        cy.get(BANNER).find('button').click();
        cy.get(BANNER).should('not.exist');
        // A second Escape must be inert — no errors, still no banner resurrection.
        cy.get('body').type('{esc}');
        cy.get(BANNER).should('not.exist');
    });
});
