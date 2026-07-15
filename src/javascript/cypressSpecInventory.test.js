// D5 — Cypress spec inventory guard.
//
// The docs (F17/AGENTS.md) referenced a single spec file that does not exist
// (01-fullReadOnlyNotifier.cy.ts) while the real suite had drifted to a multi-file
// layout — classic silent docs/code drift. This test pins the CURRENT, real inventory:
// it fails loudly (and specifically) the moment a spec file is added, renamed or
// removed without reconciling the documented inventory (AGENTS.md "Tests" section and
// this list).
//
// NOTE: jest.config.js roots only gates test DISCOVERY — reading outside
// src/javascript at runtime is fine.
const fs = require('fs');
const path = require('path');

const CYPRESS_E2E_DIR = path.resolve(__dirname, '..', '..', 'tests', 'cypress', 'e2e');

const EXPECTED_SPECS = [
    '01-fronotifierSettings.cy.ts',
    '02-fronotifierPopup.cy.ts',
    '03-fronotifierXss.cy.ts',
    '04-fronotifierPermissionScope.cy.ts',
    '05-fronotifierDefaults.cy.ts',
    '06-fronotifierEditMode.cy.ts',
    '07-fronotifierAutoPublish.cy.ts',
    '08-fronotifierSchemaShape.cy.ts',
    '09-fronotifierReadOnlyBranch.cy.ts',
    '10-fronotifierBannerA11y.cy.ts'
];

describe('Cypress spec inventory (docs/code drift guard)', () => {
    it('matches the pinned spec file list exactly', () => {
        // Act
        const actualSpecs = fs.readdirSync(CYPRESS_E2E_DIR)
            .filter(name => name.endsWith('.cy.ts'))
            .sort();

        // Assert — exact set equality: additions, renames and removals all fail here
        // until the pinned list (and the docs) are updated alongside them.
        expect(actualSpecs).toEqual(EXPECTED_SPECS);
    });

    it('does not contain the doc-referenced legacy filename', () => {
        // The filename AGENTS.md used to reference never existed in this layout; keep
        // it from being reintroduced ambiguously alongside the numbered specs.
        const actualSpecs = fs.readdirSync(CYPRESS_E2E_DIR);
        expect(actualSpecs).not.toContain('01-fullReadOnlyNotifier.cy.ts');
    });
});
