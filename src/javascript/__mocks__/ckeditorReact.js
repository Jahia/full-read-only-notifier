// Mock for `@ckeditor/ckeditor5-react`.
//
// Renders a minimal contenteditable stub and exposes a fake editor object to
// onReady so the component's onReady aria wiring runs without the real editor.
//
// The fake editor's view writer RECORDS attributes onto the fake root object
// (root.attributes) instead of no-op'ing, and every created editor is kept in
// a registry (__getFakeEditors) so accessibility tests can assert the
// aria-invalid / aria-errormessage / aria-labelledby wiring the component
// applies through editor.editing.view.change(...).
const React = require('react');

const fakeEditors = [];

const makeFakeEditor = data => {
    let current = data || '';
    const root = {attributes: {}};
    const writer = {
        setAttribute: (name, value, target) => {
            target.attributes[name] = value;
        },
        removeAttribute: (name, target) => {
            delete target.attributes[name];
        }
    };
    return {
        getData: () => current,
        setData: value => {
            current = value;
        },
        editing: {
            view: {
                change: callback => callback(writer),
                document: {
                    getRoot: () => root
                }
            }
        }
    };
};

const CKEditor = props => {
    const {data, onReady} = props;
    React.useEffect(() => {
        const editor = makeFakeEditor(data);
        fakeEditors.push(editor);
        if (onReady) {
            onReady(editor);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return React.createElement('div', {
        'data-testid': 'ckeditor',
        contentEditable: true,
        suppressContentEditableWarning: true
    }, data);
};

module.exports = {
    CKEditor,
    __getFakeEditors: () => fakeEditors,
    __resetFakeEditors: () => {
        fakeEditors.length = 0;
    }
};
