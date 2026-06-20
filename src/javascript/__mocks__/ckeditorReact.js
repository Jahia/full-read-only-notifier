// Mock for `@ckeditor/ckeditor5-react`.
//
// Renders a minimal contenteditable stub and exposes a fake editor object to
// onReady so the component's onReady aria wiring runs without the real editor.
const React = require('react');

const makeFakeEditor = data => {
    let current = data || '';
    const noopWriter = {
        setAttribute: () => {},
        removeAttribute: () => {}
    };
    return {
        getData: () => current,
        setData: value => {
            current = value;
        },
        editing: {
            view: {
                change: callback => callback(noopWriter),
                document: {
                    getRoot: () => ({})
                }
            }
        }
    };
};

const CKEditor = props => {
    const {data, onReady} = props;
    React.useEffect(() => {
        if (onReady) {
            onReady(makeFakeEditor(data));
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);
    return React.createElement('div', {
        'data-testid': 'ckeditor',
        contentEditable: true,
        suppressContentEditableWarning: true
    }, data);
};

module.exports = {CKEditor};
