// F14 — module installation prerequisites / admin route registration gating.
//
// Pins the registry.add('adminRoute', ...) call that (a) hides the admin route on any
// site where the module is not installed (requireModuleInstalledOnSite) and (b) keeps
// the frontend route permission in lockstep with the backend
// FronotifierConstants.PERMISSION_SITE_ADMIN value. A drift in either would silently
// reintroduce the "menu shows but query fails" class of bug fixed by ACDIGITAL-220.
import init from './init';
import {registry} from '@jahia/ui-extender';

jest.mock('@jahia/ui-extender', () => ({
    registry: {add: jest.fn()}
}));

describe('init (admin route registration)', () => {
    let loadNamespaces;

    beforeEach(() => {
        loadNamespaces = jest.fn();
        window.jahia = {i18n: {loadNamespaces}};
    });

    it('loads the module i18n namespace before registering the route', () => {
        // Act
        init();

        // Assert
        expect(loadNamespaces).toHaveBeenCalledWith('full-read-only-notifier');
    });

    it('registers the adminRoute with the exact gating and permission configuration', () => {
        // Act
        init();

        // Assert
        expect(registry.add).toHaveBeenCalledTimes(1);
        expect(registry.add).toHaveBeenCalledWith(
            'adminRoute',
            'fullReadOnlyNotifierManager',
            expect.objectContaining({
                targets: ['administration-sites:10'],
                // Must match the backend FronotifierConstants.PERMISSION_SITE_ADMIN
                requiredPermission: 'siteAdminFullReadOnlyNotifier',
                // Route is hidden unless the module is installed on the site
                requireModuleInstalledOnSite: 'full-read-only-notifier',
                label: 'full-read-only-notifier:label',
                isSelectable: true
            })
        );
    });

    it('registers a render function that produces the FullReadOnlyNotifier element', () => {
        // Act
        init();

        // Assert
        const options = registry.add.mock.calls[0][2];
        expect(typeof options.render).toBe('function');
        const element = options.render();
        // React elements are objects with a type; the component is a function component.
        expect(element).toBeTruthy();
        expect(typeof element.type).toBe('function');
    });
});
