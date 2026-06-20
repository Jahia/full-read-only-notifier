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
import static org.junit.Assert.assertNotNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link FullReadOnlyNotifierQueryExtension#readSettings}.
 *
 * <p>Tests target the package-private {@code readSettings} seam to avoid the static
 * {@code JCRTemplate.getInstance()} call that cannot be mocked without a running OSGi
 * container. See the TODO in the production class for the deferred refactor.
 */
@RunWith(MockitoJUnitRunner.class)
public class FullReadOnlyNotifierQueryExtensionTest {

    @Mock
    private JCRSessionWrapper session;

    @Mock
    private JCRNodeWrapper siteNode;

    @Mock
    private JCRNodeWrapper froNode;

    private static final String SITE_KEY = "testSite";
    private static final String SITE_PATH = FronotifierConstants.SITES_ROOT + SITE_KEY;

    @Before
    public void setUp() throws Exception {
        when(session.getNode(SITE_PATH)).thenReturn(siteNode);
    }

    // ------------------------------------------------------------------
    // node-present: properties exist
    // ------------------------------------------------------------------

    @Test
    public void readSettings_nodePresent_returnsStoredValues() throws Exception {
        // Arrange
        when(siteNode.hasNode(FronotifierConstants.FRONOTIFIER)).thenReturn(true);
        when(siteNode.getNode(FronotifierConstants.FRONOTIFIER)).thenReturn(froNode);
        when(froNode.hasProperty(FronotifierConstants.PROP_CONTENT_OFF)).thenReturn(true);
        when(froNode.getPropertyAsString(FronotifierConstants.PROP_CONTENT_OFF)).thenReturn("<p>Off message</p>");
        when(froNode.hasProperty(FronotifierConstants.PROP_CONTENT_ON)).thenReturn(true);
        when(froNode.getPropertyAsString(FronotifierConstants.PROP_CONTENT_ON)).thenReturn("<p>On message</p>");

        // Act
        GqlFronotifierSettings result = FullReadOnlyNotifierQueryExtension.readSettings(session, SITE_KEY);

        // Assert
        assertNotNull(result);
        assertEquals("<p>Off message</p>", result.getContentOff());
        assertEquals("<p>On message</p>", result.getContentOn());
    }

    // ------------------------------------------------------------------
    // node-present: properties absent — fall back to empty strings
    // ------------------------------------------------------------------

    @Test
    public void readSettings_nodePresent_propertiesAbsent_returnsEmptyStrings() throws Exception {
        // Arrange
        when(siteNode.hasNode(FronotifierConstants.FRONOTIFIER)).thenReturn(true);
        when(siteNode.getNode(FronotifierConstants.FRONOTIFIER)).thenReturn(froNode);
        when(froNode.hasProperty(FronotifierConstants.PROP_CONTENT_OFF)).thenReturn(false);
        when(froNode.hasProperty(FronotifierConstants.PROP_CONTENT_ON)).thenReturn(false);

        // Act
        GqlFronotifierSettings result = FullReadOnlyNotifierQueryExtension.readSettings(session, SITE_KEY);

        // Assert
        assertEquals("", result.getContentOff());
        assertEquals("", result.getContentOn());
    }

    // ------------------------------------------------------------------
    // CRITICAL-1: node absent — must return defaults WITHOUT writing
    // ------------------------------------------------------------------

    @Test
    public void readSettings_fronotifierNodeAbsent_returnsDefaultsWithoutSaving() throws Exception {
        // Arrange
        when(siteNode.hasNode(FronotifierConstants.FRONOTIFIER)).thenReturn(false);

        // Act
        GqlFronotifierSettings result = FullReadOnlyNotifierQueryExtension.readSettings(session, SITE_KEY);

        // Assert — defaults returned
        assertEquals("", result.getContentOff());
        assertEquals("", result.getContentOn());

        // Critical assertion: session.save() must NEVER be called from the query
        verify(session, never()).save();
        // And no node must have been created
        verify(siteNode, never()).addNode(
                org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.anyString());
    }

    // ------------------------------------------------------------------
    // HIGH-3: site node missing — PathNotFoundException returns defaults
    // ------------------------------------------------------------------

    @Test
    public void readSettings_siteNodeMissing_returnsDefaults() throws Exception {
        // Arrange — site node does not exist
        when(session.getNode(SITE_PATH)).thenThrow(new PathNotFoundException(SITE_PATH));

        // Act
        GqlFronotifierSettings result = FullReadOnlyNotifierQueryExtension.readSettings(session, SITE_KEY);

        // Assert — clean defaults, no exception propagated
        assertNotNull(result);
        assertEquals("", result.getContentOff());
        assertEquals("", result.getContentOn());
        // No write must occur
        verify(session, never()).save();
    }
}
