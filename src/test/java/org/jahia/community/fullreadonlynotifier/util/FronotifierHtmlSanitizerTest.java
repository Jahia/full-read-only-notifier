package org.jahia.community.fullreadonlynotifier.util;

import org.jahia.community.fullreadonlynotifier.taglib.FronotifierFunctions;
import org.junit.Test;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

/**
 * Unit tests for {@link FronotifierHtmlSanitizer} — the shared server-side allowlist applied at
 * both write time (GraphQL mutation) and render time (the {@code fro:sanitizeHtml} EL function).
 *
 * <p>These cases pin the render-time behaviour for issue #19: a hostile value written by a path
 * that bypasses the mutation (direct JCR / jContent / import) must still be neutralized on output.
 */
public class FronotifierHtmlSanitizerTest {

    @Test
    public void sanitize_null_returnsEmptyString() {
        assertEquals("", FronotifierHtmlSanitizer.sanitize(null));
    }

    @Test
    public void sanitize_empty_returnsEmptyString() {
        assertEquals("", FronotifierHtmlSanitizer.sanitize(""));
    }

    @Test
    public void sanitize_scriptTag_isStripped() {
        String result = FronotifierHtmlSanitizer.sanitize("<p>Hello</p><script>alert('xss')</script>");
        assertFalse("script tag must be removed", result.contains("<script"));
        assertFalse("alert payload must be removed", result.contains("alert("));
        assertTrue("safe content must be preserved", result.contains("Hello"));
    }

    @Test
    public void sanitize_imgOnerror_handlerIsStripped() {
        String result = FronotifierHtmlSanitizer.sanitize("<img src=\"x\" onerror=\"window.x=1\">");
        assertFalse("onerror handler must be stripped", result.toLowerCase().contains("onerror"));
    }

    @Test
    public void sanitize_javascriptHref_isStripped() {
        String result = FronotifierHtmlSanitizer.sanitize("<a href=\"javascript:alert(1)\">click</a>");
        assertFalse("javascript: href must be stripped", result.contains("javascript:"));
    }

    @Test
    public void sanitize_richFormatting_isPreserved() {
        String result = FronotifierHtmlSanitizer.sanitize("<p>Site is in <strong>read-only</strong> mode.</p>");
        assertTrue("paragraph preserved", result.contains("<p>"));
        assertTrue("strong preserved", result.contains("<strong>"));
        assertTrue("text preserved", result.contains("read-only"));
    }

    // ------------------------------------------------------------------
    // U6 — the allowlist deliberately extends Safelist.relaxed():
    //   .addTags("s", "u")                       (CKEditor Strikethrough/Underline)
    //   .addAttributes("*", "class", "style")
    //   .addAttributes("a", "target", "rel")
    // These cases pin each addition individually, so silently dropping any of
    // them (e.g. removing .addTags("s","u")) is caught by a failing test.
    // ------------------------------------------------------------------

    @Test
    public void sanitize_strikethroughTag_isPreserved() {
        String result = FronotifierHtmlSanitizer.sanitize("<p><s>old price</s></p>");
        assertTrue("<s> must be preserved (added on top of Safelist.relaxed())",
                result.contains("<s>"));
        assertTrue("text preserved", result.contains("old price"));
    }

    @Test
    public void sanitize_underlineTag_isPreserved() {
        String result = FronotifierHtmlSanitizer.sanitize("<p><u>important</u></p>");
        assertTrue("<u> must be preserved (added on top of Safelist.relaxed())",
                result.contains("<u>"));
        assertTrue("text preserved", result.contains("important"));
    }

    /**
     * CHARACTERIZATION TEST — documents CURRENT (buggy) behavior, NOT the intended contract.
     *
     * <p>The production allowlist calls {@code .addAttributes("*", "class", "style")}, but
     * jsoup's all-tags pseudo-tag is {@code ":all"}, not {@code "*"} (a literal {@code "*"}
     * only ever matches a tag actually named {@code *}, which never occurs). The intended
     * "class/style allowed on every element" rule is therefore a silent no-op and BOTH
     * attributes are stripped today — e.g. CKEditor's Alignment plugin output
     * ({@code style="text-align:center"}) is silently lost at save time.
     *
     * <p><strong>Stage 7 handoff:</strong> when the sanitizer is fixed (replace {@code "*"}
     * with {@code ":all"}), this test MUST be inverted to assert both attributes are
     * preserved. Do not delete it — repoint it at the fixed contract.
     */
    @Test
    public void sanitize_classAndStyleAttributes_currentlyStripped_documentsWildcardPseudoTagBug() {
        String result = FronotifierHtmlSanitizer.sanitize(
                "<p class=\"notice\" style=\"color:red\">styled</p>");
        assertFalse("CURRENT BUG: class is stripped because \"*\" is not jsoup's all-tags "
                + "pseudo-tag (\":all\" is)", result.contains("class="));
        assertFalse("CURRENT BUG: style is stripped because \"*\" is not jsoup's all-tags "
                + "pseudo-tag (\":all\" is)", result.contains("style="));
        assertTrue("text content is still preserved", result.contains("styled"));
    }

    @Test
    public void sanitize_targetAndRelAttributes_arePreservedOnAnchor() {
        String result = FronotifierHtmlSanitizer.sanitize(
                "<a href=\"https://example.org\" target=\"_blank\" rel=\"noopener noreferrer\">link</a>");
        assertTrue("target must be preserved on <a>", result.contains("target=\"_blank\""));
        assertTrue("rel must be preserved on <a>", result.contains("rel=\"noopener noreferrer\""));
        assertTrue("href must be preserved on <a>", result.contains("href=\"https://example.org\""));
    }

    @Test
    public void sanitize_targetAttribute_onNonAnchorElement_isStripped() {
        // target/rel are only allowlisted for <a>; on any other element they must be dropped.
        String result = FronotifierHtmlSanitizer.sanitize("<p target=\"_blank\">text</p>");
        assertFalse("target must NOT survive on a non-anchor element",
                result.contains("target="));
        assertTrue("text preserved", result.contains("text"));
    }

    @Test
    public void elFunction_delegatesToSanitizer() {
        // The fro:sanitizeHtml EL function must apply the same allowlist as the mutation.
        String malicious = "<p>x</p><script>alert(1)</script>";
        assertEquals(FronotifierHtmlSanitizer.sanitize(malicious),
                FronotifierFunctions.sanitizeHtml(malicious));
        assertFalse(FronotifierFunctions.sanitizeHtml(malicious).contains("<script"));
    }
}
