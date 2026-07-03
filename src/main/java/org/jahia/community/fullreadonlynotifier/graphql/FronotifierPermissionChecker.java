package org.jahia.community.fullreadonlynotifier.graphql;

import org.jahia.services.content.JCRNodeWrapper;
import org.jahia.services.content.JCRSessionFactory;
import org.jahia.services.content.JCRSessionWrapper;

import javax.jcr.PathNotFoundException;
import javax.jcr.RepositoryException;

/**
 * Site-scoped permission enforcement for the Full Read-Only Notifier GraphQL operations.
 *
 * <p>Replaces the DXM {@code @GraphQLRequiresPermission} annotation. That annotation is
 * enforced by {@code GqlJcrPermissionChecker}, which — for a permission name containing no
 * {@code '/'} — evaluates the permission against the repository <strong>root node</strong>
 * {@code /}. A site administrator holds site-level permissions only on their own
 * {@code /sites/<siteKey>} node, never on {@code /}, so the annotation denies every
 * non-server-level administrator even though this is a site-level admin panel. The mismatch
 * also contradicts the frontend admin route, whose permission is evaluated on the site.
 *
 * <p>This checker instead evaluates {@link FronotifierConstants#PERMISSION_SITE_ADMIN} on the
 * target site node using the <em>current user's</em> session, which is the correct scope.
 */
final class FronotifierPermissionChecker {

    private FronotifierPermissionChecker() {
    }

    /**
     * Enforces that the current user may administer the notifier settings of the given site.
     *
     * @param safeSiteKey a pre-validated site key (see
     *                    {@link FronotifierConstants#requireValidSiteKey(String)})
     * @throws FronotifierAccessDeniedException if the current user lacks
     *         {@link FronotifierConstants#PERMISSION_SITE_ADMIN} on {@code /sites/<safeSiteKey>},
     *         or if that site node does not exist
     * @throws RepositoryException if an unexpected JCR error occurs
     */
    static void requireSiteAdmin(String safeSiteKey) throws RepositoryException {
        final JCRSessionWrapper userSession =
                JCRSessionFactory.getInstance().getCurrentUserSession("default");
        requireSiteAdmin(userSession, safeSiteKey);
    }

    /**
     * Package-private seam for unit testing: performs the check against a supplied session
     * without the static {@link JCRSessionFactory#getInstance()} lookup.
     *
     * @param userSession the current user's JCR session
     * @param safeSiteKey a pre-validated site key
     * @throws FronotifierAccessDeniedException if the permission is absent or the site is missing
     * @throws RepositoryException if an unexpected JCR error occurs
     */
    static void requireSiteAdmin(JCRSessionWrapper userSession, String safeSiteKey)
            throws RepositoryException {
        final JCRNodeWrapper siteNode;
        try {
            siteNode = userSession.getNode(FronotifierConstants.SITES_ROOT + safeSiteKey);
        } catch (PathNotFoundException e) {
            // Fail closed: no site node means no grantable permission for this caller.
            throw new FronotifierAccessDeniedException("Access denied");
        }
        if (!siteNode.hasPermission(FronotifierConstants.PERMISSION_SITE_ADMIN)) {
            throw new FronotifierAccessDeniedException("Access denied");
        }
    }
}
