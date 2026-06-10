package org.jahia.community.fullreadonlynotifier.graphql;

import java.util.regex.Pattern;

/**
 * Shared constants and validation helpers for the Full Read-Only Notifier GraphQL extensions.
 */
final class FronotifierConstants {

    static final String FRONOTIFIER = "fronotifier";
    static final String FRONOTIFIER_NODE_TYPE = "jnt:fronotifier";
    static final String PROP_CONTENT_OFF = "content_off";
    static final String PROP_CONTENT_ON = "content_on";
    @SuppressWarnings("java:S1075") // Jahia framework path: site nodes always live under /sites/
    static final String SITES_ROOT = "/sites/";

    // Upper bound on a site key length; mirrors Jahia's practical site-key limits and
    // bounds the regex so a hostile, very long input cannot drive pathological matching.
    private static final int SITE_KEY_MAX_LENGTH = 150;

    // Jahia site keys are alphanumeric with dashes/underscores. This pattern also blocks
    // path traversal (no '/', no '..') and JCR-meta characters.
    private static final Pattern SITE_KEY_PATTERN =
            Pattern.compile("[A-Za-z0-9_\\-]{1," + SITE_KEY_MAX_LENGTH + "}");

    private FronotifierConstants() {
    }

    /**
     * Validates a user-supplied siteKey to prevent path traversal and JCR injection
     * before it is concatenated into a JCR path. Fails closed on any invalid input.
     */
    static String requireValidSiteKey(String siteKey) {
        if (siteKey == null || !SITE_KEY_PATTERN.matcher(siteKey).matches()) {
            throw new IllegalArgumentException("Invalid siteKey");
        }
        return siteKey;
    }
}
