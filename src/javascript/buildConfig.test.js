// D4 + F16 — build/dependency "gotchas": these tests read the REAL resolved webpack
// configuration (not the stale AGENTS.md prose) and the component source, pinning:
//   1. (D4) CKEditor5 is federated from the richtext-ckeditor5 MF remote, NOT bundled
//      locally — the opposite of what AGENTS.md's Gotchas section currently claims.
//   2. (D4) every bare `ckeditor5` import is aliased to the local shim
//      src/javascript/ckeditor5.js, which just re-exports @jahia/ckeditor5.
//   3. (F16) the admin panel instantiates its own ApolloClient inline (documented,
//      intentional gotcha that IS still accurate).
const fs = require('fs');
const path = require('path');

// webpack.config.js lives at the repo root (outside jest's roots — requiring it at
// runtime is fine, roots only gates test discovery).
const webpackConfigFactory = require('../../webpack.config');

const resolveConfig = () => webpackConfigFactory({}, {mode: 'production'});

describe('webpack config — CKEditor5 module federation (D4)', () => {
    it('aliases bare ckeditor5 imports to the local re-export shim', () => {
        // Act
        const config = resolveConfig();

        // Assert — alias points at src/javascript/ckeditor5.js
        const alias = config.resolve.alias.ckeditor5;
        expect(alias).toBeDefined();
        expect(alias.replace(/\\/g, '/')).toMatch(/src\/javascript\/ckeditor5\.js$/);

        // ...and the shim itself only re-exports the federated @jahia/ckeditor5 module
        // (no local CKEditor5 code is vendored).
        const shimSource = fs.readFileSync(alias, 'utf8');
        expect(shimSource).toMatch(/export\s+\*\s+from\s+'@jahia\/ckeditor5'/);
    });

    it('federates @jahia/ckeditor5 from the richtext-ckeditor5 remote (not bundled locally)', () => {
        // Act
        const config = resolveConfig();

        // Assert — inspect the RESOLVED ModuleFederationPlugin instance's options (the
        // remotes object passes through @jahia/webpack-config's helper, so the raw
        // call-site object is not what necessarily ships).
        const mfPlugin = config.plugins.find(
            plugin => plugin.constructor && plugin.constructor.name === 'ModuleFederationPlugin'
        );
        expect(mfPlugin).toBeDefined();
        expect(mfPlugin.options.remotes['@jahia/ckeditor5'])
            .toBe('appShell.remotes.richtextCkeditor5');
        // The module exposes itself under the app-shell remote namespace.
        expect(mfPlugin.options.library).toEqual({
            type: 'assign',
            name: 'appShell.remotes.fullReadOnlyNotifier'
        });
    });

    it('does not resolve ckeditor5 to a vendored node_modules copy', () => {
        // Act
        const config = resolveConfig();
        const alias = config.resolve.alias.ckeditor5.replace(/\\/g, '/');

        // Assert — a "local bundling" regression would alias into node_modules (or drop
        // the alias so webpack resolves the real ckeditor5 package).
        expect(alias).not.toContain('node_modules');
    });
});

describe('admin panel build/dependency choices (F16)', () => {
    const componentSource = fs.readFileSync(
        path.join(__dirname, 'FullReadOnlyNotifier', 'FullReadOnlyNotifier.jsx'),
        'utf8'
    );

    it('instantiates its own module-level ApolloClient (documented intentional gotcha)', () => {
        expect(componentSource).toMatch(/const client = new ApolloClient\(\{/);
        expect(componentSource).toMatch(/uri:\s*`\$\{window\.contextJsParameters\.contextPath\}\/modules\/graphql`/);
    });

    it('imports CKEditor plugins from the (aliased/federated) ckeditor5 module', () => {
        // The component imports from 'ckeditor5' — which the webpack alias redirects to
        // the federated shim (see D4 above); no @ckeditor/ckeditor5-build-* vendored
        // build package is imported anywhere.
        expect(componentSource).toMatch(/from 'ckeditor5'/);
        expect(componentSource).not.toMatch(/@ckeditor\/ckeditor5-build/);
    });
});
