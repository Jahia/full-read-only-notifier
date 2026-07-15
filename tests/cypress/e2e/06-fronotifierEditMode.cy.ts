import {
    WEBSITE_PATH,
    addAndPublishComponent,
    disableReadOnly,
    removeAndPublishComponent
} from '../support/fronotifierHelpers';

/**
 * U8 — edit-mode placeholder label.
 *
 * The view JSP renders `<c:if test="${renderContext.editMode}"><fmt:message
 * key='jnt_full_read_only_notifier'/></c:if>` — i.e. in Jahia's edit mode an extra
 * placeholder label ("Full Read Only Notifier", from the module resource bundle) is
 * rendered so editors can see/select the otherwise-invisible component, while the
 * notification machinery below the guard is still emitted unconditionally.
 */
describe('Full Read-Only Notifier — edit-mode placeholder label', () => {
    const COMPONENT_NAME = 'fron-editmode';
    const PLACEHOLDER_LABEL = 'Full Read Only Notifier';
    // The edit-frame rendering of the same page (renderContext.editMode === true).
    const EDIT_FRAME_PATH = '/cms/editframe/default/en/sites/digitall/home.html';

    before(() => {
        cy.login();
        addAndPublishComponent(COMPONENT_NAME);
        disableReadOnly();
    });

    after(() => {
        cy.login();
        removeAndPublishComponent(COMPONENT_NAME);
    });

    it('shows the placeholder label in edit mode', () => {
        cy.login();
        cy.visit(EDIT_FRAME_PATH);

        // The component area under the footer must expose the resource-bundle label so
        // editors can find/select the otherwise-invisible component.
        cy.contains(PLACEHOLDER_LABEL).should('exist');
    });

    it('still emits the notification machinery in edit mode (label is additive, not a replacement)', () => {
        cy.login();
        cy.visit(EDIT_FRAME_PATH);

        // The server-rendered close-label span sits OUTSIDE the editMode guard, so its
        // presence proves the cookie/banner script block is still rendered in edit mode.
        cy.get('#fro-close-label').should('exist');
    });

    it('does not show the placeholder label on the live page', () => {
        cy.visit(WEBSITE_PATH);

        // Live rendering (editMode false): the placeholder must not leak to visitors.
        // Scope the check to the component's parent area to avoid false positives from
        // unrelated page content.
        cy.get('body').should($body => {
            expect($body.text()).to.not.contain(PLACEHOLDER_LABEL);
        });
    });
});
