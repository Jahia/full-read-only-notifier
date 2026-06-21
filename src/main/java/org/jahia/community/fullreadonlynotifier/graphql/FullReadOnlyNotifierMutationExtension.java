package org.jahia.community.fullreadonlynotifier.graphql;

import graphql.annotations.annotationTypes.GraphQLDescription;
import graphql.annotations.annotationTypes.GraphQLField;
import graphql.annotations.annotationTypes.GraphQLName;
import graphql.annotations.annotationTypes.GraphQLTypeExtension;
import org.jahia.modules.graphql.provider.dxm.DXGraphQLProvider;

@GraphQLTypeExtension(DXGraphQLProvider.Mutation.class)
@GraphQLDescription("Full read-only notifier mutations")
public class FullReadOnlyNotifierMutationExtension {

    private FullReadOnlyNotifierMutationExtension() {
    }

    @GraphQLField
    @GraphQLName("fullReadOnlyNotifier")
    @GraphQLDescription("Full read-only notifier mutation namespace")
    public static FullReadOnlyNotifierMutation fullReadOnlyNotifier() {
        return new FullReadOnlyNotifierMutation();
    }
}
