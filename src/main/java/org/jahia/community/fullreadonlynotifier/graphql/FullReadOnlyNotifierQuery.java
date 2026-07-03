package org.jahia.community.fullreadonlynotifier.graphql;

import graphql.annotations.annotationTypes.GraphQLDescription;
import graphql.annotations.annotationTypes.GraphQLField;
import graphql.annotations.annotationTypes.GraphQLName;
import graphql.annotations.annotationTypes.GraphQLNonNull;
import org.jahia.services.content.JCRNodeWrapper;
import org.jahia.services.content.JCRSessionWrapper;
import org.jahia.services.content.JCRTemplate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.jcr.PathNotFoundException;
import javax.jcr.RepositoryException;

@GraphQLName("FullReadOnlyNotifierQuery")
@GraphQLDescription("Full read-only notifier queries")
public class FullReadOnlyNotifierQuery {

    private static final Logger logger = LoggerFactory.getLogger(FullReadOnlyNotifierQuery.class);

    /**
     * Reads the Full Read-Only Notifier settings for the given site.
     *
     * <p>This operation is <strong>strictly read-only</strong>: it never creates or modifies
     * JCR nodes and never calls {@code session.save()}. If the settings node does not yet
     * exist, or if the site itself does not exist, empty defaults are returned. Node
     * auto-creation is the exclusive responsibility of
     * {@code FullReadOnlyNotifierMutation#updateFronotifierSettings}.
     *
     * <p>Requires the {@link FronotifierConstants#PERMISSION_SITE_ADMIN} permission on the
     * target site, enforced by {@link FronotifierPermissionChecker} against the site node with
     * the current user's session (not the DXM {@code @GraphQLRequiresPermission} annotation,
     * which checks the repository root and would deny non-server-level administrators).
     *
     * @param siteKey the site key; must match {@code [A-Za-z0-9_-]{1,150}}
     * @return the current settings, or a default {@code GqlFronotifierSettings("", "")} when
     *         the settings node or the site node is absent
     * @throws RepositoryException if an unexpected JCR error occurs (not a missing node)
     * @throws IllegalArgumentException if {@code siteKey} fails the format validation
     * @throws FronotifierAccessDeniedException if the current user lacks the required permission
     */
    @GraphQLField
    @GraphQLName("settings")
    @GraphQLNonNull
    @GraphQLDescription("Get the Full Read-Only Notifier settings for a site")
    public GqlFronotifierSettings getFronotifierSettings(
            @GraphQLName("siteKey") @GraphQLNonNull String siteKey) throws RepositoryException {
        final String safeSiteKey = FronotifierConstants.requireValidSiteKey(siteKey);
        FronotifierPermissionChecker.requireSiteAdmin(safeSiteKey);
        return JCRTemplate.getInstance().doExecuteWithSystemSessionAsUser(null, "default", null,
                session -> readSettings(session, safeSiteKey));
    }

    /**
     * Package-private seam for unit testing: performs the actual JCR read without going
     * through the static {@link JCRTemplate#getInstance()} lookup.
     *
     * <p>NOTE (deferred): Replace the static JCRTemplate lookup in the public method with an OSGi
     * {@code @Reference}-injected service field to make the full call path testable without
     * this seam. Deferred to avoid a larger service-layer rearchitecture at this time.
     *
     * @param session    an open JCR session
     * @param safeSiteKey a pre-validated site key
     * @return the settings found in JCR, or defaults if the site/settings node is absent
     * @throws RepositoryException if an unexpected JCR error occurs
     */
    static GqlFronotifierSettings readSettings(JCRSessionWrapper session, String safeSiteKey)
            throws RepositoryException {
        final JCRNodeWrapper siteNode;
        try {
            siteNode = session.getNode(FronotifierConstants.SITES_ROOT + safeSiteKey);
        } catch (PathNotFoundException e) {
            logger.warn("fronotifierSettings: site node not found for siteKey '{}'; returning defaults", safeSiteKey);
            return new GqlFronotifierSettings("", "");
        }

        if (!siteNode.hasNode(FronotifierConstants.FRONOTIFIER)) {
            // Settings node not yet created — return defaults without writing anything.
            // Node creation is the exclusive responsibility of the mutation.
            return new GqlFronotifierSettings("", "");
        }

        final JCRNodeWrapper froNode = siteNode.getNode(FronotifierConstants.FRONOTIFIER);
        final String contentOff = froNode.hasProperty(FronotifierConstants.PROP_CONTENT_OFF)
                ? froNode.getPropertyAsString(FronotifierConstants.PROP_CONTENT_OFF) : "";
        final String contentOn = froNode.hasProperty(FronotifierConstants.PROP_CONTENT_ON)
                ? froNode.getPropertyAsString(FronotifierConstants.PROP_CONTENT_ON) : "";
        return new GqlFronotifierSettings(contentOff, contentOn);
    }
}
