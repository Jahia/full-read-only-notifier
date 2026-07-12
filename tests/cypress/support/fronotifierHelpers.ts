import {DocumentNode} from 'graphql';

/**
 * Shared helpers for the Full Read-Only Notifier Cypress specs added by the
 * SUPPORT-646 coverage initiative (05+). The pre-existing specs (01-04) keep their own
 * inline copies untouched.
 */

export const SITE_KEY = 'digitall';
export const WEBSITE_PATH = `/sites/${SITE_KEY}/home.html`;
export const COMPONENT_PARENT = `/sites/${SITE_KEY}/home/footer-1`;
export const COOKIE_NAME = 'full_read_only';
export const BANNER = '[id="froBanner"]';

/* eslint-disable @typescript-eslint/no-var-requires */
export const updateFronotifierSettings: DocumentNode =
    require('graphql-tag/loader!../fixtures/graphql/mutation/updateFronotifierSettings.graphql');
export const getFronotifierSettings: DocumentNode =
    require('graphql-tag/loader!../fixtures/graphql/query/getFronotifierSettings.graphql');
export const addFronotifierComponent: DocumentNode =
    require('graphql-tag/loader!../fixtures/graphql/mutation/addFronotifierComponent.graphql');
export const deleteNode: DocumentNode =
    require('graphql-tag/loader!../fixtures/graphql/mutation/deleteNode.graphql');
export const publishNode: DocumentNode =
    require('graphql-tag/loader!../fixtures/graphql/mutation/publishNode.graphql');
/* eslint-enable @typescript-eslint/no-var-requires */

/**
 * Toggles Jahia FULL read-only mode via the tools maintenance endpoint (the mechanism
 * driving renderContext.readOnlyStatus, which the JSP branches on).
 */
export function setFullReadOnly(enabled: boolean): void {
    cy.request({
        method: 'GET',
        url: `/modules/tools/maintenance.jsp?fullReadOnlyMode=${enabled}`,
        auth: {user: 'root', pass: Cypress.env('SUPER_USER_PASSWORD')},
        failOnStatusCode: false
    });
}

export const enableReadOnly = (): void => setFullReadOnly(true);
export const disableReadOnly = (): void => setFullReadOnly(false);

/**
 * Toggles Jahia PARTIAL read-only mode (readOnlyMode, not fullReadOnlyMode) — used to
 * put the server into a read-only-ish state that is driven by a different switch than
 * the "full" one the module's docs describe (see U9 spec).
 */
export function setPartialReadOnly(enabled: boolean): void {
    cy.request({
        method: 'GET',
        url: `/modules/tools/maintenance.jsp?readOnlyMode=${enabled}`,
        auth: {user: 'root', pass: Cypress.env('SUPER_USER_PASSWORD')},
        failOnStatusCode: false
    });
}

/** Writes the notifier settings via the module's own (sanitizing) GraphQL mutation. */
export function writeSettings(contentOff: string, contentOn: string): void {
    cy.apollo({
        mutation: updateFronotifierSettings,
        variables: {siteKey: SITE_KEY, contentOff, contentOn}
    });
}

/** Publishes the site-level fronotifier settings node so LIVE pages see the values. */
export function publishSettingsNode(): void {
    cy.apollo({
        mutation: publishNode,
        variables: {path: `/sites/${SITE_KEY}/fronotifier`}
    });
}

/** Best-effort delete (does not fail when the node does not exist). */
export function bestEffortDelete(path: string): void {
    cy.request({
        method: 'POST',
        url: '/modules/graphql',
        body: {
            query: `mutation { jcr(workspace: EDIT) { mutateNode(pathOrId: "${path}") { delete } } }`
        },
        auth: {user: 'root', pass: Cypress.env('SUPER_USER_PASSWORD')},
        failOnStatusCode: false,
        log: false
    });
}

/**
 * Adds a jnt:full_read_only_notifier component under the home footer and publishes the
 * parent so the notifier script is injected into live pages. Removes any leftover node
 * from a previous run first.
 */
export function addAndPublishComponent(componentName: string): void {
    bestEffortDelete(`${COMPONENT_PARENT}/${componentName}`);
    cy.apollo({
        mutation: addFronotifierComponent,
        variables: {parentPath: COMPONENT_PARENT, name: componentName}
    });
    cy.apollo({
        mutation: publishNode,
        variables: {path: COMPONENT_PARENT}
    });
}

/** Deletes the component and republishes the parent so LIVE is cleaned up too. */
export function removeAndPublishComponent(componentName: string): void {
    cy.apollo({
        mutation: deleteNode,
        variables: {path: `${COMPONENT_PARENT}/${componentName}`}
    });
    cy.apollo({
        mutation: publishNode,
        variables: {path: COMPONENT_PARENT}
    });
}

/** Raw (non-Apollo) GraphQL POST as root — used to probe schema shape and workspaces. */
export function rawGraphQl(query: string): Cypress.Chainable<Cypress.Response<{
    data?: Record<string, unknown> | null;
    errors?: Array<{message: string}>;
}>> {
    return cy.request({
        method: 'POST',
        url: '/modules/graphql',
        body: {query},
        auth: {user: 'root', pass: Cypress.env('SUPER_USER_PASSWORD')},
        failOnStatusCode: false
    });
}
