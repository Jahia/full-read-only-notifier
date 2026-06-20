import '@testing-library/jest-dom';

// jsdom does not implement these; CKEditor / focus management touch them.
if (!window.matchMedia) {
    window.matchMedia = () => ({
        matches: false,
        addListener: () => {},
        removeListener: () => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => false
    });
}

// Component reads window.contextJsParameters at module load (Apollo client URI).
if (!window.contextJsParameters) {
    window.contextJsParameters = {contextPath: ''};
}
