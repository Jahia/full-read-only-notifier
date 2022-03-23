window.jahia.i18n.loadNamespaces('full-read-only-notifier');

window.jahia.uiExtender.registry.add('adminRoute', 'fullReadOnlyNotifierManager', {
    targets: ['administration-sites:10'],
    requiredPermission: 'siteAdminUsers',
    requireModuleInstalledOnSite: 'full-read-only-notifier',
    label: 'full-read-only-notifier:label',
    isSelectable: true,
    iframeUrl: window.contextJsParameters.contextPath + '/cms/editframe/default/$lang/sites/$site-key.fullReadOnlyNotifierManager.html'
});
