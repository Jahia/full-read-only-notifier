package org.jahia.community.fullreadonlynotifier.graphql;

import graphql.annotations.annotationTypes.GraphQLDescription;
import graphql.annotations.annotationTypes.GraphQLField;
import graphql.annotations.annotationTypes.GraphQLName;

@GraphQLDescription("Full Read-Only Notifier settings for a site")
public class GqlFronotifierSettings {

    private final String contentOff;
    private final String contentOn;

    public GqlFronotifierSettings(String contentOff, String contentOn) {
        this.contentOff = contentOff;
        this.contentOn = contentOn;
    }

    @GraphQLField
    @GraphQLName("contentOff")
    @GraphQLDescription("Message displayed when the site is NOT in full read-only mode")
    public String getContentOff() {
        return contentOff;
    }

    @GraphQLField
    @GraphQLName("contentOn")
    @GraphQLDescription("Message displayed when the site IS in full read-only mode")
    public String getContentOn() {
        return contentOn;
    }
}
