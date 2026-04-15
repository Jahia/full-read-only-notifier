import {DocumentNode} from 'graphql';
import {enableModule, editSite} from '@jahia/cypress';

// Helper: switch a CKEditor instance (by 0-based index) to source-editing mode,
// replace its content with rawHtml, then switch back to WYSIWYG mode.
function setCkEditorContent(editorIndex: number, rawHtml: string) {
    // Open source-editing mode
    cy.get('.ck-editor').eq(editorIndex).find('.ck-source-editing-button').click();
    // Replace the entire content of the source textarea
    cy.get('.ck-editor').eq(editorIndex).find('.ck-source-editing-area textarea').clear();
    cy.get('.ck-editor').eq(editorIndex).find('.ck-source-editing-area textarea').type(rawHtml, {parseSpecialCharSequences: false});
    // Close source-editing mode (commits the HTML back to the model)
    cy.get('.ck-editor').eq(editorIndex).find('.ck-source-editing-button').click();
}

function emptyCkEditorContent(editorIndex: number) {
    // Open source-editing mode
    cy.get('.ck-editor').eq(editorIndex).find('.ck-source-editing-button').click();
    // Replace the entire content of the source textarea
    cy.get('.ck-editor')
        .eq(editorIndex)
        .find('.ck-source-editing-area textarea')
        .clear();
    // Close source-editing mode (commits the HTML back to the model)
    cy.get('.ck-editor').eq(editorIndex).find('.ck-source-editing-button').click();
}

// Helper: read visible text from a CKEditor editable area (by 0-based index).
function getCkEditorText(editorIndex: number) {
    return cy.get('.ck-editor').eq(editorIndex).find('.ck-editor__editable');
}

describe('Full Read-Only Notifier Settings', () => {
    function setServerName(siteKey: string, serverName: string) {
        editSite(siteKey, {serverName: serverName});
    }

    const siteKey = 'digitall';
    const adminPath = `/jahia/administration/${siteKey}/fullReadOnlyNotifierManager`;

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const updateFronotifierSettings: DocumentNode = require('graphql-tag/loader!../fixtures/graphql/mutation/updateFronotifierSettings.graphql');
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const getFronotifierSettings: DocumentNode = require('graphql-tag/loader!../fixtures/graphql/query/getFronotifierSettings.graphql');

    before(() => {
        cy.login();
        // Reset both fields to empty before the suite runs
        enableModule('full-read-only-notifier', siteKey);
        setServerName(siteKey, 'jahia');
        cy.apollo({
            mutation: updateFronotifierSettings,
            variables: {
                siteKey,
                contentOff: '',
                contentOn: ''
            }
        });
    });

    it('shows both editors and action buttons', () => {
        cy.login();
        cy.visit(adminPath);

        // Both CKEditor instances must be present and editable
        cy.get('.ck-editor__editable[contenteditable="true"]').should('have.length', 2);

        // Field labels
        cy.contains('Message when full read-only mode is deactivated').should('be.visible');
        cy.contains('Message when full read-only mode is activated').should('be.visible');

        // Action buttons
        cy.contains('button', 'Save').should('be.visible');
        cy.contains('button', 'Cancel').should('be.visible');
    });

    it('sets and retrieves settings via the GraphQL API', () => {
        cy.login();
        cy.apollo({
            mutation: updateFronotifierSettings,
            variables: {
                siteKey,
                contentOff: '<p>Read-only mode is <strong>off</strong>.</p>',
                contentOn: '<p>Site is in <em>read-only</em> mode.</p>'
            }
        }).its('data.updateFronotifierSettings').should('be.true');

        cy.apollo({query: getFronotifierSettings, variables: {siteKey}})
            .its('data.fronotifierSettings')
            .should((settings: Record<string, string>) => {
                expect(settings.contentOff).to.include('Read-only mode is');
                expect(settings.contentOn).to.include('Site is in');
            });
    });

    it('saves content via the UI and shows a success alert', () => {
        cy.login();
        // Pre-clear via API so the editors start empty
        cy.apollo({
            mutation: updateFronotifierSettings,
            variables: {siteKey, contentOff: '', contentOn: ''}
        });

        cy.visit(adminPath);
        cy.get('.ck-editor__editable[contenteditable="true"]').should('have.length', 2);

        setCkEditorContent(0, '<p>Deactivated message</p>');
        setCkEditorContent(1, '<p>Activated message</p>');

        cy.contains('button', 'Save').click();
        cy.contains('Settings saved successfully.').should('be.visible');

        // Verify persistence via GraphQL
        cy.apollo({query: getFronotifierSettings, variables: {siteKey}})
            .its('data.fronotifierSettings')
            .should((settings: Record<string, string>) => {
                expect(settings.contentOff).to.include('Deactivated message');
                expect(settings.contentOn).to.include('Activated message');
            });
    });

    it('loads previously saved content when the page is visited', () => {
        cy.login();
        cy.apollo({
            mutation: updateFronotifierSettings,
            variables: {
                siteKey,
                contentOff: '<p>Off content loaded from API</p>',
                contentOn: '<p>On content loaded from API</p>'
            }
        });

        cy.visit(adminPath);
        cy.get('.ck-editor__editable[contenteditable="true"]').should('have.length', 2);

        getCkEditorText(0).should('contain.text', 'Off content loaded from API');
        getCkEditorText(1).should('contain.text', 'On content loaded from API');
    });

    it('cancels edits and reverts to the last saved values', () => {
        cy.login();
        cy.apollo({
            mutation: updateFronotifierSettings,
            variables: {
                siteKey,
                contentOff: '<p>Original off</p>',
                contentOn: '<p>Original on</p>'
            }
        });

        cy.visit(adminPath);
        cy.get('.ck-editor__editable[contenteditable="true"]').should('have.length', 2);
        getCkEditorText(0).should('contain.text', 'Original off');

        // Modify without saving
        setCkEditorContent(0, '<p>Changed off</p>');
        getCkEditorText(0).should('contain.text', 'Changed off');

        cy.contains('button', 'Cancel').click();

        // Content should revert to the last saved value
        getCkEditorText(0).should('contain.text', 'Original off');
        getCkEditorText(1).should('contain.text', 'Original on');
    });

    it('persists content when navigating away and back', () => {
        cy.login();
        cy.apollo({
            mutation: updateFronotifierSettings,
            variables: {
                siteKey,
                contentOff: '<p>Persistent off</p>',
                contentOn: '<p>Persistent on</p>'
            }
        });

        // First visit
        cy.visit(adminPath);
        cy.get('.ck-editor__editable[contenteditable="true"]').should('have.length', 2);
        getCkEditorText(0).should('contain.text', 'Persistent off');

        // Navigate away and return
        cy.visit('/jahia/administration');
        cy.visit(adminPath);

        cy.get('.ck-editor__editable[contenteditable="true"]').should('have.length', 2);
        getCkEditorText(0).should('contain.text', 'Persistent off');
        getCkEditorText(1).should('contain.text', 'Persistent on');
    });

    it('clears content by saving empty values', () => {
        cy.login();
        cy.apollo({
            mutation: updateFronotifierSettings,
            variables: {
                siteKey,
                contentOff: 'To be cleared',
                contentOn: 'To be cleared'
            }
        });

        cy.visit(adminPath);
        cy.get('.ck-editor__editable[contenteditable="true"]').should('have.length', 2);

        emptyCkEditorContent(0);
        emptyCkEditorContent(1);

        cy.contains('button', 'Save').click();
        cy.contains('Settings saved successfully.').should('be.visible');

        cy.apollo({query: getFronotifierSettings, variables: {siteKey}})
            .its('data.fronotifierSettings')
            .should((settings: Record<string, string | null>) => {
                expect(settings.contentOff || '').to.be.empty;
                expect(settings.contentOn || '').to.be.empty;
            });
    });
});
