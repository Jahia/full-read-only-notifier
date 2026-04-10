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

    private static final String FRONOTIFIER = "fronotifier";
    private static final String FRONOTIFIER_NODE_TYPE = "jnt:fronotifier";
    private static final String PROP_CONTENT_OFF = "content_off";
    private static final String PROP_CONTENT_ON = "content_on";

    public FullReadOnlyNotifierQueryExtension(DXGraphQLProvider.Query query) {
    }

    @GraphQLField
    @GraphQLName("fronotifierSettings")
    @GraphQLNonNull
    @GraphQLDescription("Get the Full Read-Only Notifier settings for a site")
    @GraphQLRequiresPermission("siteAdminUsers")
    public static GqlFronotifierSettings getFronotifierSettings(
            @GraphQLName("siteKey") @GraphQLNonNull String siteKey) throws RepositoryException {
        return JCRTemplate.getInstance().doExecuteWithSystemSessionAsUser(null, "default", null, session -> {
            final JCRNodeWrapper siteNode = session.getNode("/sites/" + siteKey);
            final JCRNodeWrapper froNode;
            if (siteNode.hasNode(FRONOTIFIER)) {
                froNode = siteNode.getNode(FRONOTIFIER);
            } else {
                froNode = siteNode.addNode(FRONOTIFIER, FRONOTIFIER_NODE_TYPE);
                session.save();
            }
            final String contentOff = froNode.hasProperty(PROP_CONTENT_OFF) ? froNode.getPropertyAsString(PROP_CONTENT_OFF) : "";
            final String contentOn = froNode.hasProperty(PROP_CONTENT_ON) ? froNode.getPropertyAsString(PROP_CONTENT_ON) : "";
            return new GqlFronotifierSettings(contentOff, contentOn);
        });
    }
}
