import { DocumentNode } from 'graphql'

// Digitall website page where the component is placed
const WEBSITE_PATH = '/sites/digitall/home.html'

// Path under which the jnt:full_read_only_notifier node is added
const COMPONENT_PARENT = '/sites/digitall/home/footer-1'
const COMPONENT_NAME = 'fron-xss-popup'
const COMPONENT_PATH = `${COMPONENT_PARENT}/${COMPONENT_NAME}`

// Site-level settings node holding content_on / content_off
const FRONOTIFIER_PATH = '/sites/digitall/fronotifier'

// Cookie written/cleared by the JSP script
const COOKIE_NAME = 'full_read_only'

// The notification banner is appended to <body> by froShowNotification()
const BANNER = '[id="froBanner"]'

// ---------------------------------------------------------------------------
// Regression test for issue #19 — Stored XSS in the public notifier view.
//
// content_on / content_off are plain (string) JCR properties. Only the GraphQL
// mutation sanitizes them (Jsoup); a DIRECT JCR write (jContent / import / raw
// GraphQL setValue) bypasses that and stores hostile markup. The render layer
// must therefore NEVER emit the stored value into an executable context.
//
// The fix applies the SAME Jsoup allowlist at render time (fro:sanitizeHtml),
// emits the result as escaped text, and recovers it via .textContent + the
// froSanitize() defence-in-depth pass before banner injection. A <script> /
// <img onerror> payload must neither execute on initial load nor reach the
// banner, while benign text still renders.
//
// This spec plants the payload via the RAW JCR mutation (bypassing the
// sanitizer) and asserts that no injected script runs. It keeps to a SINGLE
// content write + single visit (mirroring 02-fronotifierPopup), because Jahia
// caches the rendered page: changing content between tests would serve a stale
// page and is a test-isolation hazard, not a product behaviour.
// ---------------------------------------------------------------------------

function setFullReadOnly(enabled: boolean) {
    cy.request({
        method: 'GET',
        url: `/modules/tools/maintenance.jsp?fullReadOnlyMode=${enabled}`,
        auth: { user: 'root', pass: Cypress.env('SUPER_USER_PASSWORD') },
        failOnStatusCode: false,
    })
}

const enableReadOnly = () => setFullReadOnly(true)
const disableReadOnly = () => setFullReadOnly(false)

describe('Full Read-Only Notifier — stored XSS regression (#19)', () => {
    const siteKey = 'digitall'

    // A single payload combining the two classic breakout vectors plus benign text.
    // window.__froXss is set only if the injected script/handler executes.
    const BENIGN_TEXT = 'Scheduled read-only maintenance'
    const XSS_PAYLOAD =
        `<p>${BENIGN_TEXT}</p>` +
        '<img src="x" onerror="window.__froXss = true">' +
        '</div><script>window.__froXss = true<\/script>'

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const updateFronotifierSettings: DocumentNode = require('graphql-tag/loader!../fixtures/graphql/mutation/updateFronotifierSettings.graphql')
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const setRawFronotifierProperty: DocumentNode = require('graphql-tag/loader!../fixtures/graphql/mutation/setRawFronotifierProperty.graphql')
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const addFronotifierComponent: DocumentNode = require('graphql-tag/loader!../fixtures/graphql/mutation/addFronotifierComponent.graphql')
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const deleteNode: DocumentNode = require('graphql-tag/loader!../fixtures/graphql/mutation/deleteNode.graphql')
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const publishNode: DocumentNode = require('graphql-tag/loader!../fixtures/graphql/mutation/publishNode.graphql')

    before(() => {
        cy.login()

        // Ensure the settings node exists, then write the hostile value DIRECTLY
        // (raw JCR setValue), bypassing the mutation's Jsoup sanitizer.
        cy.apollo({
            mutation: updateFronotifierSettings,
            variables: { siteKey, contentOff: '', contentOn: '' },
        })
        cy.apollo({
            mutation: setRawFronotifierProperty,
            variables: { path: FRONOTIFIER_PATH, property: 'content_on', value: XSS_PAYLOAD },
        })
        cy.apollo({ mutation: publishNode, variables: { path: FRONOTIFIER_PATH } })

        // Best-effort cleanup of any leftover component node from a previous run
        cy.request({
            method: 'POST',
            url: '/modules/graphql',
            body: {
                query: `mutation { jcr(workspace: EDIT) { mutateNode(pathOrId: "${COMPONENT_PATH}") { delete } } }`,
            },
            auth: { user: 'root', pass: Cypress.env('SUPER_USER_PASSWORD') },
            failOnStatusCode: false,
            log: false,
        })

        // Place the notifier component on the page and publish the PARENT so the
        // live home page is re-rendered (invalidating any cached copy) with the
        // popup script injected.
        cy.apollo({
            mutation: addFronotifierComponent,
            variables: { parentPath: COMPONENT_PARENT, name: COMPONENT_NAME },
        })
        cy.apollo({ mutation: publishNode, variables: { path: COMPONENT_PARENT } })

        enableReadOnly()
    })

    after(() => {
        disableReadOnly()
        cy.apollo({
            mutation: updateFronotifierSettings,
            variables: { siteKey, contentOff: '', contentOn: '' },
        })
        cy.apollo({ mutation: publishNode, variables: { path: FRONOTIFIER_PATH } })
        cy.apollo({ mutation: deleteNode, variables: { path: COMPONENT_PATH } })
        cy.apollo({ mutation: publishNode, variables: { path: COMPONENT_PARENT } })
    })

    afterEach(() => {
        cy.clearCookie(COOKIE_NAME)
    })

    it('neutralizes a raw-stored XSS payload (img onerror + script breakout) yet still renders benign text', () => {
        cy.login()

        // cookie ABSENT => the content_on branch fires while in read-only mode
        cy.clearCookie(COOKIE_NAME)
        cy.visit(WEBSITE_PATH, {
            onBeforeLoad(win) {
                ;(win as unknown as { __froXss?: boolean }).__froXss = undefined
            },
        })

        // The notifier script ran and rendered the banner (proves the inline
        // <script> parsed — i.e. no markup truncated it) ...
        cy.get(BANNER).should('be.visible')
        // ... and the benign portion of the content is shown to the visitor.
        cy.get(BANNER).should('contain.text', BENIGN_TEXT)

        // Give any (broken-image) error event a chance to fire before asserting.
        // eslint-disable-next-line cypress/no-unnecessary-waiting
        cy.wait(750)

        // The injected script/handler must NOT have executed.
        cy.window().should((win) => {
            expect((win as unknown as { __froXss?: boolean }).__froXss).to.be.undefined
        })

        // And no executable surface reached the banner DOM.
        cy.get(BANNER).find('script').should('not.exist')
        cy.get(BANNER)
            .find('img')
            .each(($img) => {
                expect($img.attr('onerror')).to.be.undefined
            })
    })
})
