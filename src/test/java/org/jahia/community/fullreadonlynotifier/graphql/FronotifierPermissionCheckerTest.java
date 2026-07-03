package org.jahia.community.fullreadonlynotifier.graphql;

import org.jahia.services.content.JCRNodeWrapper;
import org.jahia.services.content.JCRSessionWrapper;
import org.junit.Before;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.mockito.Mock;
import org.mockito.junit.MockitoJUnitRunner;

import javax.jcr.PathNotFoundException;

import static org.junit.Assert.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for {@link FronotifierPermissionChecker#requireSiteAdmin(JCRSessionWrapper, String)}.
 *
 * <p>Tests target the package-private session-accepting seam to avoid the static
 * {@code JCRSessionFactory.getInstance()} lookup that cannot be mocked without a running OSGi
 * container. They verify the site-scoped enforcement that replaces the DXM
 * {@code @GraphQLRequiresPermission} annotation: the permission is checked on the target site
 * node, and access is denied both when the permission is absent and when the site is missing.
 */
@RunWith(MockitoJUnitRunner.class)
public class FronotifierPermissionCheckerTest {

    @Mock
    private JCRSessionWrapper session;

    @Mock
    private JCRNodeWrapper siteNode;

    private static final String SITE_KEY = "testSite";
    private static final String SITE_PATH = FronotifierConstants.SITES_ROOT + SITE_KEY;

    @Before
    public void setUp() throws Exception {
        when(session.getNode(SITE_PATH)).thenReturn(siteNode);
    }

    // ------------------------------------------------------------------
    // Granted: permission present on the site node -> no exception
    // ------------------------------------------------------------------

    @Test
    public void requireSiteAdmin_permissionGrantedOnSite_passes() throws Exception {
        // Arrange
        when(siteNode.hasPermission(FronotifierConstants.PERMISSION_SITE_ADMIN)).thenReturn(true);

        // Act — must not throw
        FronotifierPermissionChecker.requireSiteAdmin(session, SITE_KEY);

        // Assert — the check was evaluated against the SITE node, not the repository root
        verify(session).getNode(SITE_PATH);
        verify(siteNode).hasPermission(FronotifierConstants.PERMISSION_SITE_ADMIN);
    }

    // ------------------------------------------------------------------
    // Denied: permission absent on the site node
    // ------------------------------------------------------------------

    @Test
    public void requireSiteAdmin_permissionAbsent_throwsAccessDenied() throws Exception {
        // Arrange — user holds the site-administrator role nowhere relevant to this site
        when(siteNode.hasPermission(FronotifierConstants.PERMISSION_SITE_ADMIN)).thenReturn(false);

        // Act + Assert
        assertThrows(FronotifierAccessDeniedException.class,
                () -> FronotifierPermissionChecker.requireSiteAdmin(session, SITE_KEY));
    }

    // ------------------------------------------------------------------
    // Fail closed: the site node does not exist
    // ------------------------------------------------------------------

    @Test
    public void requireSiteAdmin_siteNodeMissing_throwsAccessDenied() throws Exception {
        // Arrange
        when(session.getNode(SITE_PATH)).thenThrow(new PathNotFoundException(SITE_PATH));

        // Act + Assert — no permission can be granted on a non-existent node, so deny
        assertThrows(FronotifierAccessDeniedException.class,
                () -> FronotifierPermissionChecker.requireSiteAdmin(session, SITE_KEY));
    }
}
