package org.jahia.community.fullreadonlynotifier.graphql;

import graphql.annotations.annotationTypes.GraphQLDescription;
import graphql.annotations.annotationTypes.GraphQLField;
import graphql.annotations.annotationTypes.GraphQLName;
import graphql.annotations.annotationTypes.GraphQLNonNull;
import org.jahia.community.fullreadonlynotifier.util.FronotifierHtmlSanitizer;
import org.jahia.services.content.JCRNodeWrapper;
import org.jahia.services.content.JCRSessionWrapper;
import org.jahia.services.content.JCRTemplate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.jcr.PathNotFoundException;
import javax.jcr.RepositoryException;

@GraphQLName("FullReadOnlyNotifierMutation")
@GraphQLDescription("Full read-only notifier mutations")
public class FullReadOnlyNotifierMutation {

    private static final Logger logger = LoggerFactory.getLogger(FullReadOnlyNotifierMutation.class);

    /**
     * Serializes the {@code hasNode → addNode → setProperty → save()} sequence in
     * {@link #writeSettings}, closing the check-then-act race where two concurrent first
     * writes for the same site both observe {@code hasNode() == false} and both call
     * {@code addNode(...)} (duplicate node or {@code ItemExistsException} at save).
     *
     * <p>A single JVM-wide lock is deliberate (KISS): settings writes are rare, admin-only
     * operations, so per-site lock striping is not warranted. Note this guards a single JVM
     * only — in a Jahia cluster two different nodes could still race; acceptable for this
     * admin-only, idempotent-after-creation write.
     */
    private static final Object SETTINGS_WRITE_LOCK = new Object();

    /**
     * Updates the Full Read-Only Notifier settings for the given site.
     *
     * <p>Both {@code contentOff} and {@code contentOn} are admin-authored rich-text HTML
     * fields rendered directly to site visitors by the JSP component. Before storage, each
     * value is:
     * <ol>
     *   <li>Checked against a {@value FronotifierConstants#CONTENT_MAX_LENGTH}-byte length
     *       limit to prevent oversized JCR property writes.</li>
     *   <li>Sanitized with the shared {@link FronotifierHtmlSanitizer} Jsoup allowlist to strip
     *       executable content such as {@code <script>}, inline event handlers, and
     *       {@code javascript:} hrefs. The same allowlist is applied again at render time, so the
     *       value is also safe if it reaches the node by a write path that bypasses this mutation.</li>
     * </ol>
     *
     * <p>Requires the {@link FronotifierConstants#PERMISSION_SITE_ADMIN} permission on the
     * target site, enforced by {@link FronotifierPermissionChecker} against the site node with
     * the current user's session (not the DXM {@code @GraphQLRequiresPermission} annotation,
     * which checks the repository root and would deny non-server-level administrators).
     *
     * @param siteKey    the site key; must match {@code [A-Za-z0-9_-]{1,150}}
     * @param contentOff HTML message shown when full-read-only mode is OFF (site is writable)
     * @param contentOn  HTML message shown when full-read-only mode is ON (site is read-only)
     * @return {@code true} on success
     * @throws RepositoryException      if an unexpected JCR error occurs (not a missing node)
     * @throws IllegalArgumentException if {@code siteKey} fails format validation or either
     *                                  content field exceeds the maximum length
     * @throws IllegalStateException    if the target site node does not exist in JCR
     * @throws FronotifierAccessDeniedException if the current user lacks the required permission
     */
    @GraphQLField
    @GraphQLName("updateSettings")
    @GraphQLNonNull
    @GraphQLDescription("Update the Full Read-Only Notifier settings for a site")
    public boolean updateFronotifierSettings(
            @GraphQLName("siteKey") @GraphQLNonNull String siteKey,
            @GraphQLName("contentOff") @GraphQLNonNull String contentOff,
            @GraphQLName("contentOn") @GraphQLNonNull String contentOn) throws RepositoryException {
        final String safeSiteKey = FronotifierConstants.requireValidSiteKey(siteKey);
        FronotifierPermissionChecker.requireSiteAdmin(safeSiteKey);
        final String safeContentOff = sanitizeContent(contentOff, "contentOff");
        final String safeContentOn = sanitizeContent(contentOn, "contentOn");
        return JCRTemplate.getInstance().doExecuteWithSystemSessionAsUser(null, "default", null,
                session -> writeSettings(session, safeSiteKey, safeContentOff, safeContentOn));
    }

    /**
     * Package-private seam for unit testing: performs the actual JCR write without going
     * through the static {@link JCRTemplate#getInstance()} lookup.
     *
     * <p>NOTE (deferred): Replace the static JCRTemplate lookup in the public method with an OSGi
     * {@code @Reference}-injected service field to make the full call path testable without
     * this seam. Deferred to avoid a larger service-layer rearchitecture at this time.
     *
     * <p>Concurrency: the settings-node check-create-save sequence is serialized by
     * {@link #SETTINGS_WRITE_LOCK}, so concurrent first writes create the {@code fronotifier}
     * node exactly once and the later writer updates the winner's node.
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

        synchronized (SETTINGS_WRITE_LOCK) {
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
        }
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
        return FronotifierHtmlSanitizer.sanitize(content);
    }
}
