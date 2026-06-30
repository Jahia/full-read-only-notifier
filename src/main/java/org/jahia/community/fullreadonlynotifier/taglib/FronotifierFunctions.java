package org.jahia.community.fullreadonlynotifier.taglib;

import org.jahia.community.fullreadonlynotifier.util.FronotifierHtmlSanitizer;

/**
 * EL functions exposed to the Full Read-Only Notifier view JSP.
 *
 * <p>Backing class for the {@code fro} taglib declared in
 * {@code META-INF/fronotifier-functions.tld}. Because this class lives in the module bundle, the
 * compiled JSP servlet (loaded by the module bundle classloader) can resolve it without an
 * {@code Import-Package} entry.
 */
public final class FronotifierFunctions {

    private FronotifierFunctions() {
        // Utility class — no instances.
    }

    /**
     * Server-side allowlist sanitization of stored notifier HTML, applied at render time.
     *
     * <p>Mirrors the write-time sanitization the GraphQL mutation performs, so the rendered value
     * is safe regardless of how the {@code content_off}/{@code content_on} JCR property was written
     * (the property is a plain string, so jContent / import / REST writes bypass the mutation).
     *
     * @param html the raw stored HTML (may be {@code null})
     * @return allowlist-sanitized HTML, never {@code null}
     */
    public static String sanitizeHtml(String html) {
        return FronotifierHtmlSanitizer.sanitize(html);
    }
}
