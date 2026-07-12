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
 * U9 — which server states drive the read-only banner branch.
 *
 * The JSP branches on `<c:when test="${renderContext.readOnlyStatus eq 'OFF'}">` with
 * the read-only banner in `<c:otherwise>` — i.e. ANY status other than the literal
 * string 'OFF' shows the warning banner (a fail-safe-to-warning default).
 *
 * Stage 6 empirical finding (this environment, single node): the OTHER maintenance
 * switch — legacy PARTIAL read-only mode (`maintenance.jsp?readOnlyMode=true`, which
 * blocks edit/contribute/studio/administration) — does NOT feed
 * `renderContext.readOnlyStatus` at all. That status is owned exclusively by the FULL
 * read-only controller (`fullReadOnlyMode`), whose non-OFF transitional states are not
 * deterministically reachable on a single node. The original plan (prove the fail-safe
 * branch via partial mode) was therefore unsound: under partial mode the status stays
 * the literal 'OFF' and no banner renders — verified against a live server.
 *
 * So this spec now pins the empirically-true lever boundary instead:
 *   1. legacy partial read-only mode does NOT trigger the notifier (characterization —
 *      with a positive control so a missing component can never fake a pass), and
 *   2. the literal OFF status renders no banner (without a dedupe cookie present).
 * The "any non-OFF status warns" claim remains a JSP-level reading with no reachable
 * end-to-end third state; it is documented here rather than asserted.
 */
describe('Full Read-Only Notifier — read-only status levers (full vs legacy partial)', () => {
    const COMPONENT_NAME = 'fron-nonoff';
    const ON_MARKER = 'read-only branch marker';
    const OFF_MARKER = 'off branch text';

    before(() => {
        cy.login();
        writeSettings(`<p>${OFF_MARKER}</p>`, `<p>${ON_MARKER}</p>`);
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

    it('does NOT show the banner under legacy PARTIAL read-only mode (readOnlyStatus is owned by the full toggle only)', () => {
        // Positive control first — prove the component is present and its script runs
        // on this page (the "off" banner shows when the dedupe cookie is preset), so
        // the absence asserted below cannot be a vacuous pass.
        cy.setCookie(COOKIE_NAME, 'Y');
        cy.visit(WEBSITE_PATH);
        cy.get(BANNER).should('be.visible');
        cy.get(BANNER).should('contain.text', OFF_MARKER);
        cy.clearCookie(COOKIE_NAME);

        // Arrange — legacy partial read-only: edit/admin modes are blocked, but the
        // full-read-only controller (the only writer of readOnlyStatus) is untouched.
        setPartialReadOnly(true);

        // Act
        cy.visit(WEBSITE_PATH);

        // Assert — the status is still the literal 'OFF', so the warning branch does
        // not fire and no dedupe cookie is written. Pinning this keeps any later
        // coupling of the notifier to the legacy switch a deliberate, visible change.
        cy.get(BANNER).should('not.exist');
        cy.getCookie(COOKIE_NAME).should('be.null');

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
