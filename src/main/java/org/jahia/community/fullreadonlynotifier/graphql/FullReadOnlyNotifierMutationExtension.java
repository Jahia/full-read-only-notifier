package org.jahia.community.fullreadonlynotifier.graphql;

import graphql.annotations.annotationTypes.GraphQLDescription;
import graphql.annotations.annotationTypes.GraphQLField;
import graphql.annotations.annotationTypes.GraphQLName;
import graphql.annotations.annotationTypes.GraphQLNonNull;
import graphql.annotations.annotationTypes.GraphQLTypeExtension;
import org.jahia.modules.graphql.provider.dxm.DXGraphQLProvider;
import org.jahia.modules.graphql.provider.dxm.security.GraphQLRequiresPermission;
import org.jahia.services.content.JCRNodeWrapper;
import org.jahia.services.content.JCRSessionWrapper;
import org.jahia.services.content.JCRTemplate;
import org.jsoup.Jsoup;
import org.jsoup.safety.Safelist;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.jcr.PathNotFoundException;
import javax.jcr.RepositoryException;

@GraphQLTypeExtension(DXGraphQLProvider.Mutation.class)
@GraphQLDescription("Full Read-Only Notifier mutations")
public class FullReadOnlyNotifierMutationExtension {

    private static final Logger logger = LoggerFactory.getLogger(FullReadOnlyNotifierMutationExtension.class);

    /**
     * Jsoup allowlist for admin-authored rich-text HTML.
     *
     * <p>Permits the tags and attributes produced by CKEditor5 for standard rich-text
     * formatting (headings, bold, italic, lists, links, images) while stripping any
     * executable content (script, style with expressions, on* event handlers, javascript:
     * href values, etc.).
     *
     * <p>Security note: this is a server-side, write-time control. The JSP rendering layer
     * applies an additional output-side escape as a defence-in-depth measure. Both controls
     * must be maintained independently.
     */
    private static final Safelist RICH_TEXT_SAFELIST = Safelist.relaxed()
            .addTags("s", "u")
            .addAttributes("*", "class", "style")
            .addAttributes("a", "target", "rel");

    private FullReadOnlyNotifierMutationExtension() {
    }

    /**
     * Updates the Full Read-Only Notifier settings for the given site.
     *
     * <p>Both {@code contentOff} and {@code contentOn} are admin-authored rich-text HTML
     * fields rendered directly to site visitors by the JSP component. Before storage, each
     * value is:
     * <ol>
     *   <li>Checked against a {@value FronotifierConstants#CONTENT_MAX_LENGTH}-byte length
     *       limit to prevent oversized JCR property writes.</li>
     *   <li>Sanitized with a Jsoup allowlist ({@link Safelist#relaxed()} plus {@code class},
     *       {@code style}, {@code target}, {@code rel} attributes) to strip executable content
     *       such as {@code <script>}, inline event handlers, and {@code javascript:} hrefs.</li>
     * </ol>
     *
     * <p>Requires the {@code siteAdminUsers} permission on the target site.
     *
     * @param siteKey    the site key; must match {@code [A-Za-z0-9_-]{1,150}}
     * @param contentOff HTML message shown when full-read-only mode is OFF (site is writable)
     * @param contentOn  HTML message shown when full-read-only mode is ON (site is read-only)
     * @return {@code true} on success
     * @throws RepositoryException      if an unexpected JCR error occurs (not a missing node)
     * @throws IllegalArgumentException if {@code siteKey} fails format validation or either
     *                                  content field exceeds the maximum length
     * @throws IllegalStateException    if the target site node does not exist in JCR
     */
    @GraphQLField
    @GraphQLName("updateFronotifierSettings")
    @GraphQLNonNull
    @GraphQLDescription("Update the Full Read-Only Notifier settings for a site")
    @GraphQLRequiresPermission("siteAdminUsers")
    public static boolean updateFronotifierSettings(
            @GraphQLName("siteKey") @GraphQLNonNull String siteKey,
            @GraphQLName("contentOff") @GraphQLNonNull String contentOff,
            @GraphQLName("contentOn") @GraphQLNonNull String contentOn) throws RepositoryException {
        final String safeSiteKey = FronotifierConstants.requireValidSiteKey(siteKey);
        final String safeContentOff = sanitizeContent(contentOff, "contentOff");
        final String safeContentOn = sanitizeContent(contentOn, "contentOn");
        return JCRTemplate.getInstance().doExecuteWithSystemSessionAsUser(null, "default", null,
                session -> writeSettings(session, safeSiteKey, safeContentOff, safeContentOn));
    }

    /**
     * Package-private seam for unit testing: performs the actual JCR write without going
     * through the static {@link JCRTemplate#getInstance()} lookup.
     *
     * <p>TODO: Replace the static JCRTemplate lookup in the public method with an OSGi
     * {@code @Reference}-injected service field to make the full call path testable without
     * this seam. Deferred to avoid a larger service-layer rearchitecture at this time.
     *
     * @param session        an open JCR session
     * @param safeSiteKey    a pre-validated site key
     * @param safeContentOff pre-sanitized HTML for the "off" state
     * @param safeContentOn  pre-sanitized HTML for the "on" state
     * @return {@code true} on success
     * @throws IllegalStateException if the site node does not exist in JCR
     * @throws RepositoryException   if an unexpected JCR error occurs
     */
    static boolean writeSettings(JCRSessionWrapper session, String safeSiteKey,
            String safeContentOff, String safeContentOn) throws RepositoryException {
        final JCRNodeWrapper siteNode;
        try {
            siteNode = session.getNode(FronotifierConstants.SITES_ROOT + safeSiteKey);
        } catch (PathNotFoundException e) {
            logger.warn("updateFronotifierSettings: site node not found for siteKey '{}'", safeSiteKey);
            throw new IllegalStateException("Site not found: " + safeSiteKey, e);
        }

        final JCRNodeWrapper froNode;
        if (siteNode.hasNode(FronotifierConstants.FRONOTIFIER)) {
            froNode = siteNode.getNode(FronotifierConstants.FRONOTIFIER);
        } else {
            froNode = siteNode.addNode(FronotifierConstants.FRONOTIFIER,
                    FronotifierConstants.FRONOTIFIER_NODE_TYPE);
        }
        froNode.setProperty(FronotifierConstants.PROP_CONTENT_OFF, safeContentOff);
        froNode.setProperty(FronotifierConstants.PROP_CONTENT_ON, safeContentOn);
        session.save();
        return Boolean.TRUE;
    }

    /**
     * Validates the length of a content field and sanitizes it with a Jsoup allowlist.
     *
     * @param content   the raw HTML value from the GraphQL caller
     * @param fieldName the field name used in error messages
     * @return the sanitized HTML string
     * @throws IllegalArgumentException if {@code content} exceeds
     *         {@value FronotifierConstants#CONTENT_MAX_LENGTH} bytes (UTF-8)
     */
    static String sanitizeContent(String content, String fieldName) {
        if (content == null) {
            return "";
        }
        if (content.getBytes(java.nio.charset.StandardCharsets.UTF_8).length
                > FronotifierConstants.CONTENT_MAX_LENGTH) {
            throw new IllegalArgumentException(
                    fieldName + " exceeds maximum allowed length of "
                    + FronotifierConstants.CONTENT_MAX_LENGTH + " bytes");
        }
        return Jsoup.clean(content, RICH_TEXT_SAFELIST);
    }
}
