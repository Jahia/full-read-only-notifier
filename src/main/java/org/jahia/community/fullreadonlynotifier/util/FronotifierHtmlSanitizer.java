package org.jahia.community.fullreadonlynotifier.util;

import org.jsoup.Jsoup;
import org.jsoup.safety.Safelist;

/**
 * Shared server-side HTML sanitizer for Full Read-Only Notifier content.
 *
 * <p>Applies a Jsoup allowlist permitting the tags and attributes produced by CKEditor5 for
 * standard rich-text formatting (headings, bold, italic, lists, links, images) while stripping
 * any executable content ({@code <script>}, {@code on*} event handlers, {@code javascript:}
 * hrefs, etc.).
 *
 * <p>This is the single source of truth for the allowlist, reused by two controls:
 * <ul>
 *   <li>the GraphQL mutation, at <em>write</em> time
 *       ({@code FullReadOnlyNotifierMutation#sanitizeContent}); and</li>
 *   <li>the view JSP, at <em>render</em> time (via the {@code fro:sanitizeHtml} EL function in
 *       {@code FronotifierFunctions}).</li>
 * </ul>
 *
 * <p>The render-time control matters because {@code content_off}/{@code content_on} are plain
 * {@code (string)} JCR properties: a direct JCR / jContent / import / REST write bypasses the
 * mutation entirely, so the rendering layer must not trust the stored value.
 */
public final class FronotifierHtmlSanitizer {

    /** Allowlist of tags/attributes considered safe for admin-authored rich text. */
    private static final Safelist RICH_TEXT_SAFELIST = Safelist.relaxed()
            .addTags("s", "u")
            .addAttributes("*", "class", "style")
            .addAttributes("a", "target", "rel");

    private FronotifierHtmlSanitizer() {
        // Utility class — no instances.
    }

    /**
     * Sanitizes an HTML fragment against the rich-text allowlist.
     *
     * @param html raw HTML (may be {@code null})
     * @return the allowlist-sanitized HTML, or an empty string when {@code html} is
     *         {@code null} or empty
     */
    public static String sanitize(String html) {
        if (html == null || html.isEmpty()) {
            return "";
        }
        return Jsoup.clean(html, RICH_TEXT_SAFELIST);
    }
}
