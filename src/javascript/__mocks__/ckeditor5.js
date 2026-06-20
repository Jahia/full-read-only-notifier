// Mock for the `ckeditor5` / `@jahia/ckeditor5` modules.
//
// The component imports many named plugin classes plus ClassicEditor from this
// module. For unit tests we don't run the real editor, so every named import
// resolves to a harmless placeholder via an ES-module-interop-friendly Proxy.
const handler = {
    get: (target, prop) => {
        if (prop === '__esModule') {
            return true;
        }

        // Return a no-op stub class for any requested named export.
        return function CkeditorStub() {};
    }
};

module.exports = new Proxy({}, handler);
