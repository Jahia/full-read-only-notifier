import React from 'react';
import {registry} from '@jahia/ui-extender';
import {FullReadOnlyNotifier} from './FullReadOnlyNotifier/FullReadOnlyNotifier';

export default function () {
    window.jahia.i18n.loadNamespaces('full-read-only-notifier');

    registry.add('adminRoute', 'fullReadOnlyNotifierManager', {
        targets: ['administration-sites:10'],
        requiredPermission: 'siteAdminUsers',
        requireModuleInstalledOnSite: 'full-read-only-notifier',
        label: 'full-read-only-notifier:label',
        isSelectable: true,
        render: () => React.createElement(FullReadOnlyNotifier)
    });

    console.debug('%c full-read-only-notifier routes registered', 'color: #463CBA');
}
