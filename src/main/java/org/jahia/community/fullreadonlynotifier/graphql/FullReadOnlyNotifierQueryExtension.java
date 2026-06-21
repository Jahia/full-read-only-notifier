package org.jahia.community.fullreadonlynotifier.graphql;

import graphql.annotations.annotationTypes.GraphQLDescription;
import graphql.annotations.annotationTypes.GraphQLField;
import graphql.annotations.annotationTypes.GraphQLName;
import graphql.annotations.annotationTypes.GraphQLTypeExtension;
import org.jahia.modules.graphql.provider.dxm.DXGraphQLProvider;

@GraphQLTypeExtension(DXGraphQLProvider.Query.class)
@GraphQLDescription("Full read-only notifier queries")
public class FullReadOnlyNotifierQueryExtension {

    private FullReadOnlyNotifierQueryExtension() {
    }

    @GraphQLField
    @GraphQLName("fullReadOnlyNotifier")
    @GraphQLDescription("Full read-only notifier query namespace")
    public static FullReadOnlyNotifierQuery fullReadOnlyNotifier() {
        return new FullReadOnlyNotifierQuery();
    }
}
