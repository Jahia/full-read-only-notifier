import { DocumentNode } from 'graphql'
import { enableModule, createUser, deleteUser, grantRoles } from '@jahia/cypress'

/**
 * Regression coverage for the permission-scope bug (ACDIGITAL-220).
 *
 * The GraphQL query/mutation were previously gated with the DXM
 * {@code @GraphQLRequiresPermission("siteAdminUsers")} annotation, which the provider
 * evaluates against the repository ROOT node. A non-root site administrator holds
 * site-level permissions only on {@code /sites/<siteKey>}, never on {@code /}, so the
 * annotation denied the exact audience this site-level panel is built for — while the
 * site-scoped frontend route still showed the menu (menu appears, query fails).
 *
 * The fix enforces {@code siteAdminFullReadOnlyNotifier} on the SITE node with the current
 * user's session. These tests assert both halves of the contract with NON-root users:
 *   1. a site administrator can read AND update settings (the bug being fixed), and
 *   2. an authenticated user without the site-administrator role is still denied.
 *
 * IMPORTANT: `cy.apollo` authenticates as `root` by default. To exercise the permission
 * check we MUST run each call through `cy.apolloClient({username, password})` so the query
 * executes as the intended NON-root user. `cy.login` only drives the browser session (used
 * by the UI test); it does not change who `cy.apollo` authenticates as.
 */
describe('Full Read-Only Notifier — permission scope (non-root users)', () => {
    const siteKey = 'digitall'

    // Non-root principals provisioned for this suite.
    const SITE_ADMIN_USER = 'fro-siteadmin'
    const NON_ADMIN_USER = 'fro-editor'
    const PASSWORD = 'password'

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const getFronotifierSettings: DocumentNode = require('graphql-tag/loader!../fixtures/graphql/query/getFronotifierSettings.graphql')
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const updateFronotifierSettings: DocumentNode = require('graphql-tag/loader!../fixtures/graphql/mutation/updateFronotifierSettings.graphql')

    before(() => {
        cy.login() // root
        enableModule('full-read-only-notifier', siteKey)

        // A non-root SITE ADMINISTRATOR: holds the built-in site-administrator role on the
        // site node. That role grants the `site-admin` umbrella permission, which by Jahia
        // permission-tree inheritance covers the module's nested `siteAdminFullReadOnlyNotifier`.
        createUser(SITE_ADMIN_USER, PASSWORD)
        grantRoles(`/sites/${siteKey}`, ['site-administrator'], SITE_ADMIN_USER, 'USER')

        // A non-root user WITHOUT any site-administration role on the site.
        createUser(NON_ADMIN_USER, PASSWORD)
    })

    after(() => {
        cy.login() // root
        deleteUser(SITE_ADMIN_USER)
        deleteUser(NON_ADMIN_USER)
    })

    it('lets a non-root site administrator READ the settings (regression: was Permission denied)', () => {
        cy.apolloClient({ username: SITE_ADMIN_USER, password: PASSWORD })
            .apollo({
                query: getFronotifierSettings,
                variables: { siteKey },
                errorPolicy: 'all',
            })
            .then((result: { data?: { fullReadOnlyNotifier?: { settings?: unknown } | null }; errors?: unknown[] }) => {
                // The whole point of the fix: no access-denied error for a site admin.
                expect(JSON.stringify(result.errors || []), 'GraphQL errors').to.not.contain('denied')
                // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                expect(result.data?.fullReadOnlyNotifier?.settings ?? null, 'settings payload').to.not.be.null
            })
    })

    it('lets a non-root site administrator UPDATE the settings', () => {
        cy.apolloClient({ username: SITE_ADMIN_USER, password: PASSWORD })
            .apollo({
                mutation: updateFronotifierSettings,
                variables: {
                    siteKey,
                    contentOff: '<p>Writable (set by site admin)</p>',
                    contentOn: '<p>Read-only (set by site admin)</p>',
                },
                errorPolicy: 'all',
            })
            .its('data.fullReadOnlyNotifier.updateSettings')
            .should('be.true')

        // Read back (as root) to confirm the write actually landed.
        cy.apollo({ query: getFronotifierSettings, variables: { siteKey }, errorPolicy: 'all' })
            .its('data.fullReadOnlyNotifier.settings')
            .should((settings: Record<string, string>) => {
                expect(settings.contentOff).to.include('set by site admin')
                expect(settings.contentOn).to.include('set by site admin')
            })
    })

    it('shows the admin panel UI to a non-root site administrator', () => {
        cy.login(SITE_ADMIN_USER, PASSWORD)
        cy.visit(`/jahia/administration/${siteKey}/fullReadOnlyNotifierManager`)

        // If the route/permission were still root-scoped this panel would never render.
        cy.get('.ck-editor__editable[contenteditable="true"]').should('have.length', 2)
        cy.contains('button', 'Save').should('be.visible')
    })

    it('still DENIES an authenticated user without the site-administrator role', () => {
        cy.apolloClient({ username: NON_ADMIN_USER, password: PASSWORD })
            .apollo({
                query: getFronotifierSettings,
                variables: { siteKey },
                errorPolicy: 'all',
            })
            .then((result: { data?: { fullReadOnlyNotifier?: { settings?: unknown } | null }; errors?: unknown[] }) => {
                // Access denied surfaces as a GraphQL error with a null settings payload.
                expect(JSON.stringify(result.errors || []), 'GraphQL errors').to.contain('denied')
                // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                expect(result.data?.fullReadOnlyNotifier?.settings ?? null, 'settings payload').to.be.null
            })
    })
})
