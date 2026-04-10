package org.jahia.community.fullreadonlynotifier.graphql;

import org.jahia.modules.graphql.provider.dxm.DXGraphQLExtensionsProvider;
import org.osgi.service.component.annotations.Component;

import java.util.Arrays;
import java.util.Collection;

@Component(service = DXGraphQLExtensionsProvider.class, immediate = true)
public class FullReadOnlyNotifierGraphQLExtensionProvider implements DXGraphQLExtensionsProvider {

    @Override
    public Collection<Class<?>> getExtensions() {
        return Arrays.asList(
                FullReadOnlyNotifierQueryExtension.class,
                FullReadOnlyNotifierMutationExtension.class
        );
    }
}
