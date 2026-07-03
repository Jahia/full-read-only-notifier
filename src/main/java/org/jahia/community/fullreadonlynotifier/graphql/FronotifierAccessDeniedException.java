package org.jahia.community.fullreadonlynotifier.graphql;

import graphql.ErrorType;
import org.jahia.modules.graphql.provider.dxm.BaseGqlClientException;

/**
 * Signals that the current user lacks the {@link FronotifierConstants#PERMISSION_SITE_ADMIN}
 * permission on the target site.
 *
 * <p>The DXM {@code GqlAccessDeniedException} would be the natural type to throw here, but its
 * constructor is package-private to {@code org.jahia.modules.graphql.provider.dxm.security}
 * and therefore not usable from this module. This exception mirrors its role — a
 * client-facing, site-scoped access-denied error surfaced through the GraphQL response — while
 * remaining throwable from module code.
 */
public class FronotifierAccessDeniedException extends BaseGqlClientException {

    private static final long serialVersionUID = 1L;

    public FronotifierAccessDeniedException(String message) {
        super(message, ErrorType.DataFetchingException);
    }
}
