import {
    SITE_KEY,
    publishSettingsNode,
    writeSettings
} from '../support/fronotifierHelpers';

/**
 * U7 — the settings node auto-publishes.
 *
 * definitions.cnd declares `[jnt:fronotifier] > jnt:content, jmix:autoPublish`, so
 * settings written by the mutation (which targets the default/EDIT workspace) must
 * become visible on LIVE without any explicit publish step.
 *
 * This also resolves the reconciliation point flagged in Stage 2: the popup spec (02)
 * defensively calls publishNode after updateFronotifierSettings — if this spec passes,
 * that publish is confirmed redundant; if it fails, autoPublish does not cover property
 * updates and the explicit publish is load-bearing (a real docs/behavior divergence).
 */
describe('Full Read-Only Notifier — settings node auto-publish (jmix:autoPublish)', () => {
    const SETTINGS_NODE_PATH = `/sites/${SITE_KEY}/fronotifier`;
    const LIVE_RETRIES = 10;
    const LIVE_RETRY_WAIT_MS = 1000;

    /** Reads a property of the settings node from the LIVE workspace (root auth). */
    function readLiveProperty(propertyName: string): Cypress.Chainable<string | null> {
        return cy.request({
            method: 'POST',
            url: '/modules/graphql',
            body: {
                query: `query {
                    jcr(workspace: LIVE) {
                        nodeByPath(path: "${SETTINGS_NODE_PATH}") {
                            property(name: "${propertyName}") { value }
                        }
                    }
                }`
            },
            auth: {user: 'root', pass: Cypress.env('SUPER_USER_PASSWORD')},
            failOnStatusCode: false
        }).then(response => {
            const node = response.body?.data?.jcr?.nodeByPath;
            return (node && node.property && node.property.value) || null;
        });
    }

    /**
     * Auto-publish is listener-driven and may lag the mutation slightly; retry the LIVE
     * read a bounded number of times instead of asserting on the first response.
     */
    function expectLivePropertyEventually(propertyName: string, expectedMarker: string, retriesLeft: number): void {
        readLiveProperty(propertyName).then(value => {
            if (value !== null && value.includes(expectedMarker)) {
                expect(value, `LIVE ${propertyName}`).to.include(expectedMarker);
            } else if (retriesLeft > 0) {
                // Auto-publish is listener-driven with no completion event to hook on;
                // a bounded, fixed backoff between LIVE re-reads is the only option.
                // eslint-disable-next-line cypress/no-unnecessary-waiting
                cy.wait(LIVE_RETRY_WAIT_MS);
                expectLivePropertyEventually(propertyName, expectedMarker, retriesLeft - 1);
            } else {
                // Final, failing assertion with a helpful message.
                expect(value, `LIVE ${propertyName} after ${LIVE_RETRIES} retries (autoPublish did not propagate)`)
                    .to.include(expectedMarker);
            }
        });
    }

    before(() => {
        cy.login();
        // Guarantee the settings node exists on BOTH workspaces before the actual
        // experiment, so the test below isolates the "property update" case from the
        // "node creation" case (this is the only explicit publish in this spec).
        writeSettings('<p>baseline off</p>', '<p>baseline on</p>');
        publishSettingsNode();
    });

    it('exposes the settings node on LIVE (creation path)', () => {
        cy.request({
            method: 'POST',
            url: '/modules/graphql',
            body: {
                query: `query { jcr(workspace: LIVE) { nodeByPath(path: "${SETTINGS_NODE_PATH}") { path } } }`
            },
            auth: {user: 'root', pass: Cypress.env('SUPER_USER_PASSWORD')},
            failOnStatusCode: false
        }).then(response => {
            expect(response.body?.data?.jcr?.nodeByPath?.path, 'settings node on LIVE')
                .to.eq(SETTINGS_NODE_PATH);
        });
    });

    it('propagates property updates to LIVE without an explicit publish step', () => {
        // Arrange — a unique marker so a stale LIVE value can never false-positive
        const marker = `autopublish-${Date.now()}`;

        // Act — write via the module mutation only; deliberately NO publishNode call
        writeSettings(`<p>off ${marker}</p>`, `<p>on ${marker}</p>`);

        // Assert — the LIVE workspace picks the new values up on its own
        expectLivePropertyEventually('content_on', marker, LIVE_RETRIES);
        expectLivePropertyEventually('content_off', marker, LIVE_RETRIES);
    });
});
