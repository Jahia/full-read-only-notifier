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

    @Test
    public void elFunction_delegatesToSanitizer() {
        // The fro:sanitizeHtml EL function must apply the same allowlist as the mutation.
        String malicious = "<p>x</p><script>alert(1)</script>";
        assertEquals(FronotifierHtmlSanitizer.sanitize(malicious),
                FronotifierFunctions.sanitizeHtml(malicious));
        assertFalse(FronotifierFunctions.sanitizeHtml(malicious).contains("<script"));
    }
}
