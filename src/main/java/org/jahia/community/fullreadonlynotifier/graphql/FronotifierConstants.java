package org.jahia.community.fullreadonlynotifier.graphql;

import java.util.regex.Pattern;

/**
 * Shared constants and validation helpers for the Full Read-Only Notifier GraphQL extensions.
 *
 * <p>Property naming convention:
 * <ul>
 *   <li>{@link #PROP_CONTENT_ON}  — HTML message shown when the site IS in full-read-only mode
 *       (site is read-only / locked down).</li>
 *   <li>{@link #PROP_CONTENT_OFF} — HTML message shown when the site is NOT in full-read-only
 *       mode (site has returned to writable / normal operation).
 *       The name "off" refers to the full-read-only feature being OFF, meaning the site is
 *       writable again. This is intentionally the inverse of the property name.</li>
 * </ul>
 */
final class FronotifierConstants {

    static final String FRONOTIFIER = "fronotifier";
    static final String FRONOTIFIER_NODE_TYPE = "jnt:fronotifier";

    /**
     * JCR property for the HTML message displayed when full-read-only mode is OFF
     * (i.e. the site has returned to normal writable operation).
     * The name "off" refers to the read-only feature being disabled — the site is writable.
     */
    static final String PROP_CONTENT_OFF = "content_off";

    /**
     * JCR property for the HTML message displayed when full-read-only mode is ON
     * (i.e. the site is currently locked into read-only operation).
     */
    static final String PROP_CONTENT_ON = "content_on";

    @SuppressWarnings("java:S1075") // Jahia framework path: site nodes always live under /sites/
    static final String SITES_ROOT = "/sites/";

    /**
     * Maximum byte length accepted for {@code contentOn} / {@code contentOff} HTML values.
     * 65 536 bytes (64 KiB) is generous for admin-authored rich-text while preventing
     * unreasonably large JCR property writes and potential denial-of-service via oversized input.
     */
    static final int CONTENT_MAX_LENGTH = 65_536;

    // Upper bound on a site key length; mirrors Jahia's practical site-key limits and
    // bounds the regex so a hostile, very long input cannot drive pathological matching.
    private static final int SITE_KEY_MAX_LENGTH = 150;

    // Jahia site keys are alphanumeric with dashes/underscores. Explicit ^ and $ anchors
    // ensure the entire string is validated, not just a substring. This pattern also blocks
    // path traversal (no '/', no '..') and JCR-meta characters.
    // Note: String.matches() implicitly anchors, but explicit anchors make the intent clear
    // and safe if this pattern is ever used with Matcher.find() in future.
    private static final Pattern SITE_KEY_PATTERN =
            Pattern.compile("^[A-Za-z0-9_\\-]{1," + SITE_KEY_MAX_LENGTH + "}$");

    private FronotifierConstants() {
    }

    /**
     * Validates a user-supplied siteKey to prevent path traversal and JCR injection
     * before it is concatenated into a JCR path. Fails closed on any invalid input.
     *
     * @param siteKey the raw siteKey value supplied by the GraphQL caller
     * @return the same {@code siteKey} value if valid
     * @throws IllegalArgumentException if {@code siteKey} is null, empty, exceeds
     *         {@value #SITE_KEY_MAX_LENGTH} characters, or contains any character outside
     *         {@code [A-Za-z0-9_-]}
     */
    static String requireValidSiteKey(String siteKey) {
        if (siteKey == null || !SITE_KEY_PATTERN.matcher(siteKey).matches()) {
            throw new IllegalArgumentException("Invalid siteKey");
        }
        return siteKey;
    }
}
