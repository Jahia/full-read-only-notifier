# full-read-only-notifier

Jahia OSGi **site-level** module that lets site admins configure an HTML message displayed when the site is in full-read-only mode (and an "on" counterpart when it resumes). Admin UI at `/jahia/administration/{siteKey}/fullReadOnlyNotifierManager`.

## Key Facts

- **artifactId**: `full-read-only-notifier` | **version**: `2.0.5-SNAPSHOT`
- **Java package**: `org.jahia.community.fullreadonlynotifier`
- **jahia-depends**: `default,siteSettings,graphql-dxm-provider,richtext-ckeditor5`
- No Spring/Blueprint — pure OSGi DS
- Site-level admin route (not server-level)

## Architecture

| Class | Role |
|-------|------|
| `FullReadOnlyNotifierQueryExtension` | GraphQL query: reads or auto-creates the settings node |
| `FullReadOnlyNotifierMutationExtension` | GraphQL mutation: writes settings to JCR |
| `GqlFronotifierSettings` | Return type: `{contentOff, contentOn}` |

Settings node: `/sites/{siteKey}/fronotifier` (type `jnt:fronotifier`).  
Properties: `content_off` (HTML shown when read-only), `content_on` (HTML shown when back online).

The query auto-creates the node if absent (no separate provisioning step needed).

## GraphQL API

| Operation | Name | Notes |
|-----------|------|-------|
| Query | `fronotifierSettings(siteKey!)` → `{contentOff, contentOn}` | Creates node on first read |
| Mutation | `updateFronotifierSettings(siteKey!, contentOff!, contentOn!)` → Boolean | Overwrites both fields |

Both require the `siteAdminFullReadOnlyNotifier` permission, checked **on the target site node** (`/sites/{siteKey}`) via `FronotifierPermissionChecker` using the current user's session.

## Build

```bash
mvn clean install
yarn build
yarn lint
```

- Admin route target: `administration-sites:10` (site admin panel)
- Route key: `fullReadOnlyNotifierManager`
- `requireModuleInstalledOnSite: 'full-read-only-notifier'` — route is hidden unless module is installed on that site

## Tests (Cypress Docker)

```bash
cd tests
cp .env.example .env
yarn install
./ci.build.sh && ./ci.startup.sh
```

- Tests: `tests/cypress/e2e/01-fronotifierSettings.cy.ts` … `10-fronotifierBannerA11y.cy.ts` (10 numbered specs: settings UI/API, popup + cookie attributes, XSS regression, permission scope, default messages, edit-mode label, auto-publish, GraphQL schema shape, non-OFF banner branch, banner a11y — inventory pinned by `src/javascript/cypressSpecInventory.test.js`)
- Admin path: `/jahia/administration/{siteKey}/fullReadOnlyNotifierManager`

## Gotchas

- **CKEditor5 is bundled locally** — this component imports directly from `ckeditor5` (GPL licence key), not from the `richtext-ckeditor5` Module Federation remote. This inflates the bundle size. Future modules should import CKEditor5 from the `richtext-ckeditor5` MF remote instead.
- The Apollo client is instantiated inline in the component (`new ApolloClient({...})`) rather than using the Jahia-provided one — this is intentional to avoid context dependency issues in the site admin panel.
- Permission is enforced **site-scoped** on the backend: `FronotifierPermissionChecker.requireSiteAdmin(siteKey)` checks `siteAdminFullReadOnlyNotifier` on `/sites/{siteKey}` with the current user's session. Do **not** revert to `@GraphQLRequiresPermission` — the DXM annotation evaluates the permission against the repository **root node** `/`, which only `root`/server-level admins hold, so it denies ordinary site administrators (the intended audience) while the site-scoped frontend route still shows the menu. `siteAdminFullReadOnlyNotifier` is defined under the core `site-admin` permission in `permissions.xml`, so the built-in `site-administrator` role grants it automatically (permission-tree inheritance) — no role provisioning needed.
- CSS Modules: class prefix is not a short acronym here; match via `[class*="fronotifier_"]` in Cypress
