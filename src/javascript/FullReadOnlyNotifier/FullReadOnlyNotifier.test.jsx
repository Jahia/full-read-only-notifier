import React from 'react';
import {render, screen, fireEvent, waitFor} from '@testing-library/react';
import * as apollo from '@apollo/client';
import {getSiteKey, FronotifierForm} from './FullReadOnlyNotifier';

// Helper to set window.location.pathname in jsdom.
const setPathname = pathname => {
    window.history.pushState({}, '', pathname);
};

describe('getSiteKey', () => {
    it('returns the site key segment for a valid administration path', () => {
        // Arrange
        setPathname('/jahia/administration/digitall/fullReadOnlyNotifierManager');

        // Act
        const siteKey = getSiteKey();

        // Assert
        expect(siteKey).toBe('digitall');
    });

    it('returns null when there is no site segment', () => {
        // Arrange
        setPathname('/jahia/administration/');

        // Act
        const siteKey = getSiteKey();

        // Assert
        expect(siteKey).toBeNull();
    });
});

describe('FronotifierForm', () => {
    beforeEach(() => {
        setPathname('/jahia/administration/digitall/fullReadOnlyNotifierManager');
        apollo.useQuery.mockReturnValue({
            data: {fronotifierSettings: {contentOff: '', contentOn: ''}},
            loading: false,
            error: undefined
        });
        // Default mutation stub; individual tests override as needed.
        apollo.useMutation.mockReturnValue([jest.fn().mockResolvedValue({data: {}}), {loading: false}]);
    });

    it('renders the noSiteKey error UI and skips the query when no site key is present', () => {
        // Arrange
        setPathname('/jahia/administration/');

        // Act
        render(<FronotifierForm/>);

        // Assert
        expect(screen.getByRole('alert')).toHaveTextContent('settings.noSiteKey');
    });

    it('announces success when the mutation resolves truthy', async () => {
        // Arrange
        const mutate = jest.fn().mockResolvedValue({data: {updateFronotifierSettings: true}});
        apollo.useMutation.mockReturnValue([mutate, {loading: false}]);
        render(<FronotifierForm/>);

        // Act
        fireEvent.click(screen.getByText('settings.save'));

        // Assert
        await waitFor(() => expect(mutate).toHaveBeenCalledWith({
            variables: {siteKey: 'digitall', contentOff: '', contentOn: ''}
        }));
        await waitFor(() => {
            expect(screen.getByText('settings.saved', {selector: '[aria-hidden="true"]'})).toBeInTheDocument();
        });
    });

    it('announces an error when the mutation resolves falsy', async () => {
        // Arrange
        const mutate = jest.fn().mockResolvedValue({data: {updateFronotifierSettings: false}});
        apollo.useMutation.mockReturnValue([mutate, {loading: false}]);
        render(<FronotifierForm/>);

        // Act
        fireEvent.click(screen.getByText('settings.save'));

        // Assert
        await waitFor(() => {
            expect(screen.getByText('settings.saveError', {selector: '[aria-hidden="true"]'})).toBeInTheDocument();
        });
    });

    it('announces an error when the mutation throws', async () => {
        // Arrange
        const mutate = jest.fn().mockRejectedValue(new Error('network down'));
        apollo.useMutation.mockReturnValue([mutate, {loading: false}]);
        render(<FronotifierForm/>);

        // Act
        fireEvent.click(screen.getByText('settings.save'));

        // Assert
        await waitFor(() => {
            expect(screen.getByText('settings.saveError', {selector: '[aria-hidden="true"]'})).toBeInTheDocument();
        });
    });
});
