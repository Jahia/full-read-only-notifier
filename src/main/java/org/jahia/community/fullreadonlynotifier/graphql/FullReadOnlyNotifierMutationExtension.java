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

@GraphQLTypeExtension(DXGraphQLProvider.Mutation.class)
@GraphQLDescription("Full Read-Only Notifier mutations")
public class FullReadOnlyNotifierMutationExtension {

    private static final String FRONOTIFIER = "fronotifier";
    private static final String FRONOTIFIER_NODE_TYPE = "jnt:fronotifier";
    private static final String PROP_CONTENT_OFF = "content_off";
    private static final String PROP_CONTENT_ON = "content_on";

    private FullReadOnlyNotifierMutationExtension() {
    }

    @GraphQLField
    @GraphQLName("updateFronotifierSettings")
    @GraphQLNonNull
    @GraphQLDescription("Update the Full Read-Only Notifier settings for a site")
    @GraphQLRequiresPermission("siteAdminUsers")
    public static boolean updateFronotifierSettings(
            @GraphQLName("siteKey") @GraphQLNonNull String siteKey,
            @GraphQLName("contentOff") @GraphQLNonNull String contentOff,
            @GraphQLName("contentOn") @GraphQLNonNull String contentOn) throws RepositoryException {
        return JCRTemplate.getInstance().doExecuteWithSystemSessionAsUser(null, "default", null, session -> {
            final JCRNodeWrapper siteNode = session.getNode("/sites/" + siteKey);
            final JCRNodeWrapper froNode;
            if (siteNode.hasNode(FRONOTIFIER)) {
                froNode = siteNode.getNode(FRONOTIFIER);
            } else {
                froNode = siteNode.addNode(FRONOTIFIER, FRONOTIFIER_NODE_TYPE);
            }
            froNode.setProperty(PROP_CONTENT_OFF, contentOff);
            froNode.setProperty(PROP_CONTENT_ON, contentOn);
            session.save();
            return Boolean.TRUE;
        });
    }
}
