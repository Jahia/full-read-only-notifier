import {
    BANNER,
    COOKIE_NAME,
    WEBSITE_PATH,
    addAndPublishComponent,
    disableReadOnly,
    enableReadOnly,
    publishSettingsNode,
    removeAndPublishComponent,
    writeSettings
} from '../support/fronotifierHelpers';

/**
 * F7 — default fallback messages.
 *
 * When the stored content_on / content_off properties are EMPTY, the JSP's
 * `<c:if test="${fronotifier.properties['content_x'] ne ''}">` override guard never
 * fires and the resource-bundle defaults render instead
 * (src/main/resources/resources/full-read-only-notifier.properties):
 *   full_read_only_notifier.on.notification  = "The website is currently in read-only
 *                                               mode, some functionalities might be disabled"
 *   full_read_only_notifier.off.notification = "The website is not in read-only mode anymore"
 *
 * The pre-existing popup spec (02) always configures explicit values before asserting,
 * so the literal default text was never covered.
 */
describe('Full Read-Only Notifier — default fallback messages', () => {
    const COMPONENT_NAME = 'fron-defaults';
    const DEFAULT_ON = 'The website is currently in read-only mode, some functionalities might be disabled';
    const DEFAULT_OFF = 'The website is not in read-only mode anymore';

    before(() => {
        cy.login();

        // Clear both configured messages, then publish the settings node so the LIVE
        // rendering also sees the cleared values.
        writeSettings('', '');
        publishSettingsNode();

        addAndPublishComponent(COMPONENT_NAME);
        disableReadOnly();
    });

    afterEach(() => {
        cy.clearCookie(COOKIE_NAME);
    });

    after(() => {
        disableReadOnly();
        cy.login();
        removeAndPublishComponent(COMPONENT_NAME);
    });

    it('renders the resource-bundle default "on" message when contentOn is empty', () => {
        enableReadOnly();
        cy.visit(WEBSITE_PATH);

        cy.get(BANNER).should('be.visible');
        cy.get(BANNER).should('contain.text', DEFAULT_ON);

        disableReadOnly();
    });

    it('renders the resource-bundle default "off" message when contentOff is empty', () => {
        cy.setCookie(COOKIE_NAME, 'Y');
        cy.visit(WEBSITE_PATH);

        cy.get(BANNER).should('be.visible');
        cy.get(BANNER).should('contain.text', DEFAULT_OFF);
    });
});
