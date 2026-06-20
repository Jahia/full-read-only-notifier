package org.jahia.community.fullreadonlynotifier.graphql;

import org.jahia.services.content.JCRNodeWrapper;
import org.jahia.services.content.JCRSessionWrapper;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnitRunner;

import javax.jcr.PathNotFoundException;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertThrows;
import static org.junit.Assert.assertTrue;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link FullReadOnlyNotifierMutationExtension}.
 *
 * <p>Tests target the package-private {@code writeSettings} and {@code sanitizeContent}
 * seams to avoid the static {@code JCRTemplate.getInstance()} call. See the
 * deferred-refactor note in the production class.
 */
@RunWith(MockitoJUnitRunner.class)
public class FullReadOnlyNotifierMutationExtensionTest {

    @Mock
    private JCRSessionWrapper session;

    @Mock
    private JCRNodeWrapper siteNode;

    @Mock
    private JCRNodeWrapper froNode;

    private static final String SITE_KEY = "testSite";
    private static final String SITE_PATH = FronotifierConstants.SITES_ROOT + SITE_KEY;
    private static final String CONTENT_OFF = "<p>Site is writable again.</p>";
    private static final String CONTENT_ON  = "<p>Site is in read-only mode.</p>";

    @Before
    public void setUp() throws Exception {
        when(session.getNode(SITE_PATH)).thenReturn(siteNode);
    }

    // ------------------------------------------------------------------
    // Valid update — fronotifier node already exists
    // ------------------------------------------------------------------

    @Test
    public void writeSettings_nodeExists_updatesPropertiesAndSaves() throws Exception {
        // Arrange
        when(siteNode.hasNode(FronotifierConstants.FRONOTIFIER)).thenReturn(true);
        when(siteNode.getNode(FronotifierConstants.FRONOTIFIER)).thenReturn(froNode);

        // Act
        boolean result = FullReadOnlyNotifierMutationExtension.writeSettings(
                session, SITE_KEY, CONTENT_OFF, CONTENT_ON);

        // Assert
        assertTrue(result);
        verify(froNode).setProperty(FronotifierConstants.PROP_CONTENT_OFF, CONTENT_OFF);
        verify(froNode).setProperty(FronotifierConstants.PROP_CONTENT_ON, CONTENT_ON);
        verify(session).save();
    }

    // ------------------------------------------------------------------
    // Valid update — fronotifier node does not yet exist (auto-create)
    // ------------------------------------------------------------------

    @Test
    public void writeSettings_nodeAbsent_createsNodeAndSaves() throws Exception {
        // Arrange
        when(siteNode.hasNode(FronotifierConstants.FRONOTIFIER)).thenReturn(false);
        when(siteNode.addNode(FronotifierConstants.FRONOTIFIER,
                FronotifierConstants.FRONOTIFIER_NODE_TYPE)).thenReturn(froNode);

        // Act
        boolean result = FullReadOnlyNotifierMutationExtension.writeSettings(
                session, SITE_KEY, CONTENT_OFF, CONTENT_ON);

        // Assert
        assertTrue(result);
        verify(siteNode).addNode(FronotifierConstants.FRONOTIFIER,
                FronotifierConstants.FRONOTIFIER_NODE_TYPE);
        verify(froNode).setProperty(FronotifierConstants.PROP_CONTENT_OFF, CONTENT_OFF);
        verify(froNode).setProperty(FronotifierConstants.PROP_CONTENT_ON, CONTENT_ON);
        verify(session).save();
    }

    // ------------------------------------------------------------------
    // HIGH-3: site node missing — throws IllegalStateException (no raw path leaked)
    // ------------------------------------------------------------------

    @Test
    public void writeSettings_siteNodeMissing_throwsIllegalStateExceptionWithoutRawPath()
            throws Exception {
        // Arrange
        when(session.getNode(SITE_PATH)).thenThrow(new PathNotFoundException(SITE_PATH));

        // Act + Assert
        IllegalStateException ex = assertThrows(IllegalStateException.class,
                () -> FullReadOnlyNotifierMutationExtension.writeSettings(
                        session, SITE_KEY, CONTENT_OFF, CONTENT_ON));

        // The message must contain the safe site key but must NOT contain the raw JCR path
        assertTrue("Exception message should reference the site key",
                ex.getMessage().contains(SITE_KEY));
        assertTrue("Exception message must not contain the raw JCR SITES_ROOT path",
                !ex.getMessage().contains(FronotifierConstants.SITES_ROOT));

        // No partial write must occur
        verify(session, never()).save();
    }

    // ------------------------------------------------------------------
    // CRITICAL-2: invalid siteKey rejected before any JCR access
    // ------------------------------------------------------------------

    @Test
    public void requireValidSiteKey_invalidSiteKey_throwsBeforeJcrAccess() {
        assertThrows(IllegalArgumentException.class,
                () -> FronotifierConstants.requireValidSiteKey("../../etc/passwd"));
    }

    // ------------------------------------------------------------------
    // CRITICAL-2: content length limit enforced
    // ------------------------------------------------------------------

    @Test
    public void sanitizeContent_exceedsMaxLength_throwsIllegalArgument() {
        // Arrange — build a string that exceeds 64 KiB
        StringBuilder sb = new StringBuilder(FronotifierConstants.CONTENT_MAX_LENGTH + 10);
        for (int i = 0; i <= FronotifierConstants.CONTENT_MAX_LENGTH; i++) {
            sb.append('a');
        }
        final String oversized = sb.toString();

        // Act + Assert
        assertThrows(IllegalArgumentException.class,
                () -> FullReadOnlyNotifierMutationExtension.sanitizeContent(oversized, "contentOff"));
    }

    @Test
    public void sanitizeContent_withinMaxLength_returnsValue() {
        // Arrange
        final String input = "<p>Hello <b>world</b></p>";

        // Act
        String result = FullReadOnlyNotifierMutationExtension.sanitizeContent(input, "contentOff");

        // Assert — content is preserved (jsoup may normalise whitespace but keeps the text)
        assertTrue("Sanitized result should contain the text", result.contains("Hello"));
        assertTrue("Sanitized result should preserve bold tag", result.contains("<b>"));
    }

    // ------------------------------------------------------------------
    // CRITICAL-2: XSS — script tag stripped by sanitizer
    // ------------------------------------------------------------------

    @Test
    public void sanitizeContent_scriptTag_isStripped() {
        // Arrange
        final String malicious = "<p>Hello</p><script>alert('xss')</script>";

        // Act
        String result = FullReadOnlyNotifierMutationExtension.sanitizeContent(malicious, "contentOn");

        // Assert
        assertTrue("script tag must be removed", !result.contains("<script>"));
        assertTrue("alert payload must be removed", !result.contains("alert("));
        assertTrue("Safe content must be preserved", result.contains("Hello"));
    }

    @Test
    public void sanitizeContent_javascriptHref_isStripped() {
        // Arrange
        final String malicious = "<a href=\"javascript:alert(1)\">click</a>";

        // Act
        String result = FullReadOnlyNotifierMutationExtension.sanitizeContent(malicious, "contentOff");

        // Assert — href with javascript: must be removed
        assertTrue("javascript: href must be stripped", !result.contains("javascript:"));
    }

    @Test
    public void sanitizeContent_onclickAttribute_isStripped() {
        // Arrange
        final String malicious = "<p onclick=\"alert(1)\">text</p>";

        // Act
        String result = FullReadOnlyNotifierMutationExtension.sanitizeContent(malicious, "contentOn");

        // Assert
        assertTrue("onclick handler must be stripped", !result.contains("onclick"));
    }

    @Test
    public void sanitizeContent_null_returnsEmptyString() {
        // Act
        String result = FullReadOnlyNotifierMutationExtension.sanitizeContent(null, "contentOff");

        // Assert
        assertEquals("", result);
    }
}
