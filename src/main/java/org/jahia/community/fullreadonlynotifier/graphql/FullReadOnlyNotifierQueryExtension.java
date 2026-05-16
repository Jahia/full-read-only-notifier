package org.jahia.community.fullreadonlynotifier.graphql;

import graphql.annotations.annotationTypes.GraphQLDescription;
import graphql.annotations.annotationTypes.GraphQLField;
import graphql.annotations.annotationTypes.GraphQLName;
import graphql.annotations.annotationTypes.GraphQLNonNull;
import graphql.annotations.annotationTypes.GraphQLTypeExtension;
import org.jahia.modules.graphql.provider.dxm.DXGraphQLProvider;
import org.jahia.modules.graphql.provider.dxm.security.GraphQLRequiresPermission;
import org.jahia.services.content.JCRNodeWrapper;
import org.jahia.services.content.JCRTemplate;

import javax.jcr.RepositoryException;

@GraphQLTypeExtension(DXGraphQLProvider.Query.class)
@GraphQLDescription("Full Read-Only Notifier queries")
public class FullReadOnlyNotifierQueryExtension {

    private FullReadOnlyNotifierQueryExtension() {
    }

    @GraphQLField
    @GraphQLName("fronotifierSettings")
    @GraphQLNonNull
    @GraphQLDescription("Get the Full Read-Only Notifier settings for a site")
    @GraphQLRequiresPermission("siteAdminUsers")
    public static GqlFronotifierSettings getFronotifierSettings(
            @GraphQLName("siteKey") @GraphQLNonNull String siteKey) throws RepositoryException {
        final String safeSiteKey = FronotifierConstants.requireValidSiteKey(siteKey);
        return JCRTemplate.getInstance().doExecuteWithSystemSessionAsUser(null, "default", null, session -> {
            final JCRNodeWrapper siteNode = session.getNode(FronotifierConstants.SITES_ROOT + safeSiteKey);
            final JCRNodeWrapper froNode;
            if (siteNode.hasNode(FronotifierConstants.FRONOTIFIER)) {
                froNode = siteNode.getNode(FronotifierConstants.FRONOTIFIER);
            } else {
                froNode = siteNode.addNode(FronotifierConstants.FRONOTIFIER, FronotifierConstants.FRONOTIFIER_NODE_TYPE);
                session.save();
            }
            final String contentOff = froNode.hasProperty(FronotifierConstants.PROP_CONTENT_OFF)
                    ? froNode.getPropertyAsString(FronotifierConstants.PROP_CONTENT_OFF) : "";
            final String contentOn = froNode.hasProperty(FronotifierConstants.PROP_CONTENT_ON)
                    ? froNode.getPropertyAsString(FronotifierConstants.PROP_CONTENT_ON) : "";
            return new GqlFronotifierSettings(contentOff, contentOn);
        });
    }
}
