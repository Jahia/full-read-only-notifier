import {
    SITE_KEY,
    getFronotifierSettings,
    rawGraphQl,
    updateFronotifierSettings
} from '../support/fronotifierHelpers';

/**
 * D1 — the GraphQL schema is NAMESPACED; the flat root fields the README/AGENTS.md
 * document (`fronotifierSettings`, `updateFronotifierSettings`) do not exist.
 *
 * Negative half: the documented flat shapes must FAIL schema validation — pinning the
 * divergence so the dead fields can never silently "come back" (or keep misleading
 * clients) undetected.
 * Positive half: the real namespaced container round-trips correctly.
 *
 * NOTE: the negative assertions deliberately check only "non-empty errors + no usable
 * data" — the literal validation message belongs to graphql-java, not to this module's
 * contract, and may change across library upgrades.
 */
describe('Full Read-Only Notifier — GraphQL schema shape (namespaced, no flat root fields)', () => {
    before(() => {
        cy.login();
    });

    it('rejects the README-documented flat root QUERY field (fronotifierSettings)', () => {
        rawGraphQl(`query { fronotifierSettings(siteKey: "${SITE_KEY}") { contentOn contentOff } }`)
            .then(response => {
                const body = response.body;
                expect(body.errors, 'GraphQL errors').to.be.an('array').that.is.not.empty;
                expect(body.data?.fronotifierSettings ?? null, 'flat query data').to.eq(null);
            });
    });

    it('rejects the README-documented flat root MUTATION field (updateFronotifierSettings)', () => {
        rawGraphQl(`mutation { updateFronotifierSettings(siteKey: "${SITE_KEY}", contentOn: "<p>x</p>", contentOff: "<p>y</p>") }`)
            .then(response => {
                const body = response.body;
                expect(body.errors, 'GraphQL errors').to.be.an('array').that.is.not.empty;
                expect(body.data?.updateFronotifierSettings ?? null, 'flat mutation data').to.eq(null);
            });
    });

    it('accepts the real namespaced shape and round-trips values', () => {
        const marker = `schema-shape-${Date.now()}`;

        // Real mutation shape: fullReadOnlyNotifier { updateSettings(...) } — note the
        // real parameter order (siteKey, contentOff, contentOn), which also differs from
        // the README's documented (siteKey, contentOn, contentOff).
        cy.apollo({
            mutation: updateFronotifierSettings,
            variables: {
                siteKey: SITE_KEY,
                contentOff: `<p>off ${marker}</p>`,
                contentOn: `<p>on ${marker}</p>`
            }
        }).its('data.fullReadOnlyNotifier.updateSettings').should('be.true');

        // Real query shape: fullReadOnlyNotifier { settings(...) { contentOff contentOn } }
        cy.apollo({query: getFronotifierSettings, variables: {siteKey: SITE_KEY}})
            .its('data.fullReadOnlyNotifier.settings')
            .should((settings: Record<string, string>) => {
                expect(settings.contentOff).to.include(marker);
                expect(settings.contentOn).to.include(marker);
            });
    });

    it('exposes exactly the namespaced container on the schema (introspection cross-check)', () => {
        // Belt-and-braces: introspect the root Query type field names — the namespace
        // container must exist and the dead flat field must not.
        rawGraphQl('query { __schema { queryType { fields { name } } } }')
            .then(response => {
                const fields: Array<{name: string}> =
                    (response.body.data?.__schema as {queryType?: {fields?: Array<{name: string}>}})
                        ?.queryType?.fields ?? [];
                const names = fields.map(field => field.name);
                expect(names, 'root Query fields').to.include('fullReadOnlyNotifier');
                expect(names, 'root Query fields').to.not.include('fronotifierSettings');
            });
    });
});
