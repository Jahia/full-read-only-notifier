// U5 (Jest half) — admin panel accessibility wiring.
//
// The existing FullReadOnlyNotifier.test.jsx only asserts announcement TEXT; these
// tests pin the a11y mechanics themselves:
//   - live-region remount via the incrementing `key` (repeated identical messages are
//     re-announced because React replaces the <output> node),
//   - aria-invalid / aria-errormessage wiring on both CKEditor view roots tied to save
//     state, plus the assertive error region,
//   - distinct per-editor aria-labelledby / aria-label (screen readers must be able to
//     tell the "off" and "on" editors apart),
//   - focus moved to the panel heading once loading resolves.
import React from 'react';
import {render, screen, fireEvent, waitFor} from '@testing-library/react';
import * as apollo from '@apollo/client';
// Resolved via moduleNameMapper to src/javascript/__mocks__/ckeditorReact.js
import {__getFakeEditors, __resetFakeEditors} from '@ckeditor/ckeditor5-react';
import {FronotifierForm} from './FullReadOnlyNotifier';

const setPathname = pathname => {
    window.history.pushState({}, '', pathname);
};

describe('FronotifierForm accessibility wiring', () => {
    beforeEach(() => {
        __resetFakeEditors();
        setPathname('/jahia/administration/digitall/fullReadOnlyNotifierManager');
        apollo.useQuery.mockReturnValue({
            data: {fullReadOnlyNotifier: {settings: {contentOff: '', contentOn: ''}}},
            loading: false,
            error: undefined
        });
        apollo.useMutation.mockReturnValue([jest.fn().mockResolvedValue({data: {}}), {loading: false}]);
    });

    it('moves focus to the panel heading once loading resolves', () => {
        // Act
        render(<FronotifierForm/>);

        // Assert
        const heading = screen.getByRole('heading', {level: 2});
        expect(heading).toHaveAttribute('tabindex', '-1');
        expect(heading).toHaveFocus();
    });

    it('gives each editor a distinct accessible name via aria-labelledby/aria-label', async () => {
        // Act
        render(<FronotifierForm/>);

        // Assert — onReady wiring ran on both fake editors' view roots
        await waitFor(() => expect(__getFakeEditors()).toHaveLength(2));
        const [offRoot, onRoot] = __getFakeEditors()
            .map(editor => editor.editing.view.document.getRoot());

        expect(offRoot.attributes['aria-labelledby']).toBe('fron-label-content-off');
        expect(onRoot.attributes['aria-labelledby']).toBe('fron-label-content-on');
        expect(offRoot.attributes['aria-labelledby'])
            .not.toBe(onRoot.attributes['aria-labelledby']);
        // Both editors are marked required and described by the shared error region.
        [offRoot, onRoot].forEach(root => {
            expect(root.attributes['aria-required']).toBe('true');
            expect(root.attributes['aria-describedby']).toBe('fron-error-region');
        });
    });

    it('sets aria-invalid and aria-errormessage on both editor roots when a save fails', async () => {
        // Arrange
        const mutate = jest.fn().mockResolvedValue({data: {fullReadOnlyNotifier: {updateSettings: false}}});
        apollo.useMutation.mockReturnValue([mutate, {loading: false}]);
        render(<FronotifierForm/>);
        await waitFor(() => expect(__getFakeEditors()).toHaveLength(2));

        // Act
        fireEvent.click(screen.getByText('settings.save'));

        // Assert — both roots flagged invalid and pointed at the error region
        await waitFor(() => {
            __getFakeEditors().forEach(editor => {
                const root = editor.editing.view.document.getRoot();
                expect(root.attributes['aria-invalid']).toBe('true');
                expect(root.attributes['aria-errormessage']).toBe('fron-error-region');
            });
        });
        // The assertive error region carries the message
        expect(screen.getByRole('alert')).toHaveTextContent('settings.saveError');
    });

    it('clears aria-invalid and removes aria-errormessage after a subsequent successful save', async () => {
        // Arrange — first save fails, second succeeds
        const mutate = jest.fn()
            .mockResolvedValueOnce({data: {fullReadOnlyNotifier: {updateSettings: false}}})
            .mockResolvedValueOnce({data: {fullReadOnlyNotifier: {updateSettings: true}}});
        apollo.useMutation.mockReturnValue([mutate, {loading: false}]);
        render(<FronotifierForm/>);
        await waitFor(() => expect(__getFakeEditors()).toHaveLength(2));

        // Act — failing save first
        fireEvent.click(screen.getByText('settings.save'));
        await waitFor(() => {
            expect(__getFakeEditors()[0].editing.view.document.getRoot()
                .attributes['aria-invalid']).toBe('true');
        });

        // Act — successful save
        fireEvent.click(screen.getByText('settings.save'));

        // Assert — invalid state cleared, errormessage reference removed
        await waitFor(() => {
            __getFakeEditors().forEach(editor => {
                const root = editor.editing.view.document.getRoot();
                expect(root.attributes['aria-invalid']).toBe('false');
                expect(root.attributes['aria-errormessage']).toBeUndefined();
            });
        });
    });

    it('remounts the polite live region (key bump) so repeated identical messages re-announce', async () => {
        // Arrange
        const mutate = jest.fn().mockResolvedValue({data: {fullReadOnlyNotifier: {updateSettings: true}}});
        apollo.useMutation.mockReturnValue([mutate, {loading: false}]);
        render(<FronotifierForm/>);

        const initialRegion = screen.getByRole('status');
        expect(initialRegion).toHaveAttribute('aria-live', 'polite');
        expect(initialRegion).toHaveAttribute('aria-atomic', 'true');

        // Act — first save announces
        fireEvent.click(screen.getByText('settings.save'));
        await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('settings.saved'));
        const regionAfterFirstSave = screen.getByRole('status');
        expect(regionAfterFirstSave).not.toBe(initialRegion);

        // Act — second save with the IDENTICAL message
        fireEvent.click(screen.getByText('settings.save'));

        // Assert — a NEW DOM node carries the same message (key changed => remount),
        // which is what forces assistive tech to re-announce it.
        await waitFor(() => {
            const regionAfterSecondSave = screen.getByRole('status');
            expect(regionAfterSecondSave).toHaveTextContent('settings.saved');
            expect(regionAfterSecondSave).not.toBe(regionAfterFirstSave);
        });
    });

    it('announces cancellation through the live region', async () => {
        // Arrange
        render(<FronotifierForm/>);

        // Act
        fireEvent.click(screen.getByText('settings.cancel'));

        // Assert
        await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('settings.cancelled'));
    });
});
