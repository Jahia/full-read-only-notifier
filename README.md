# Full Read-Only Notifier

## Overview

This module displays a transient banner notification to users when a Jahia DX instance enters or exits full read-only mode. Each state transition is shown only once per browser session (tracked via cookie), so users are informed without being repeatedly interrupted.

Two notifications are configurable per site:
- **Read-only ON** — shown once when the instance enters read-only mode
- **Read-only OFF** — shown once when the instance returns to normal mode

## Requirements

| Requirement | Version |
|---|---|
| Jahia DX | ≥ 7.2.3.0 |
| `graphql-dxm-provider` | ≥ 3.4.0 |
| `richtext-ckeditor5` | any |

## Installation

1. Build or download the module JAR.
2. Deploy it to your Jahia instance.
3. Activate the module on the target site(s).

## Configuration

Once installed and activated on a site, the notification messages are managed through the Jahia administration UI:

**Administration → Sites → `<site>` → Full Read-Only Notifier**

The settings panel provides two CKEditor5 WYSIWYG editors:
- **Content On** — HTML message shown when the instance enters read-only mode.
- **Content Off** — HTML message shown when the instance exits read-only mode.

Both fields support full rich-text formatting (bold, italic, links, lists, headings, images, etc.). Settings are stored per site in the JCR under `/sites/{siteKey}/fronotifier`.

If no custom message is configured, built-in default messages are used:
- *On*: "The website is currently in read-only mode, some functionalities might be disabled"
- *Off*: "The website is not in read-only mode anymore"

Settings can also be read and updated via GraphQL:

```graphql
query {
    fronotifierSettings(siteKey: "mySite") {
        contentOn
        contentOff
    }
}
```

```graphql
mutation {
    updateFronotifierSettings(
        siteKey: "mySite"
        contentOn: "<p>The site is currently in read-only mode.</p>"
        contentOff: "<p>The site is back to normal.</p>"
    )
}
```

> Both operations require the `siteAdminUsers` permission.

## How It Works

A lightweight JSP component is rendered on each page. It checks the current read-only status via `renderContext.readOnlyStatus` and manages a `full_read_only` session cookie:

| Server state | Cookie present | Action |
|---|---|---|
| Read-only | No | Show "on" notification, set cookie |
| Read-only | Yes | Do nothing (already notified) |
| Normal | Yes | Show "off" notification, remove cookie |
| Normal | No | Do nothing |

The notification renders as a fixed-position banner (top-right corner) with a dismiss button. It is injected via plain JavaScript with no frontend framework dependency.

## Building

### Prerequisites

- Java 11+
- Maven 3.x
- Node.js v22.6.0 (managed by the Maven frontend plugin)

### Build

```bash
mvn clean install
```

The Maven build installs Node/Yarn automatically, bundles the React admin panel via Webpack, and packages everything into an OSGi JAR.
