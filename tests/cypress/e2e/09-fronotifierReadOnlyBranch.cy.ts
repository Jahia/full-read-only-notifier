import {
    BANNER,
    COOKIE_NAME,
    WEBSITE_PATH,
    addAndPublishComponent,
    disableReadOnly,
    publishSettingsNode,
    removeAndPublishComponent,
    setPartialReadOnly,
    writeSettings
} from '../support/fronotifierHelpers';

/**
 * U9 — "not OFF" (not "ON") drives the read-only banner branch.
 *
 * The JSP branches on `<c:when test="${renderContext.readOnlyStatus eq 'OFF'}">` with
 * the read-only banner in `<c:otherwise>` — i.e. ANY status other than the literal
 * string 'OFF' (including states never produced by the fullReadOnlyMode toggle the docs
 * describe) shows the warning banner. This is a fail-safe-to-warning default, not the
 * clean binary on/off framing of the docs.
 *
 * There is no public lever to force an arbitrary third status value, so this spec uses
 * the OTHER maintenance switch — PARTIAL read-only mode (readOnlyMode=true, distinct
 * from fullReadOnlyMode) — as a real, reachable server state that is not driven by the
 * documented "full read-only" toggle. If the banner shows there too, the branch is
 * proven to fire on "not OFF" rather than on an explicit full-read-only 'ON'.
 */
describe('Full Read-Only Notifier — fail-safe banner branch (any non-OFF status)', () => {
    const COMPONENT_NAME = 'fron-nonoff';
    const ON_MARKER = 'read-only branch marker';

    before(() => {
        cy.login();
        writeSettings('<p>off branch text</p>', `<p>${ON_MARKER}</p>`);
        publishSettingsNode();
        addAndPublishComponent(COMPONENT_NAME);
        // Start from the documented normal state: full read-only OFF, partial OFF.
        disableReadOnly();
        setPartialReadOnly(false);
    });

    afterEach(() => {
        cy.clearCookie(COOKIE_NAME);
    });

    after(() => {
        // Safety net: never leave the server in any read-only state.
        setPartialReadOnly(false);
        disableReadOnly();
        cy.login();
        removeAndPublishComponent(COMPONENT_NAME);
    });

    it('shows the read-only banner under PARTIAL read-only mode (a non-OFF status the full toggle never set)', () => {
        // Arrange — partial read-only: a genuine server state where the FULL read-only
        // feature was never enabled, but readOnlyStatus is no longer 'OFF'.
        setPartialReadOnly(true);
        cy.clearCookie(COOKIE_NAME);

        // Act
        cy.visit(WEBSITE_PATH);

        // Assert — the <c:otherwise> (warning) branch fires and behaves exactly like the
        // documented "on" path: banner with the configured contentOn, dedupe cookie set.
        cy.get(BANNER).should('be.visible');
        cy.get(BANNER).should('contain.text', ON_MARKER);
        cy.getCookie(COOKIE_NAME).should('have.property', 'value', 'Y');

        setPartialReadOnly(false);
    });

    it('shows no banner (without a cookie) once the status is back to the literal OFF', () => {
        // Arrange
        setPartialReadOnly(false);
        disableReadOnly();
        cy.clearCookie(COOKIE_NAME);

        // Act
        cy.visit(WEBSITE_PATH);

        // Assert — only the exact 'OFF' status suppresses the warning branch.
        cy.get(BANNER).should('not.exist');
    });
});
