// Jest configuration for the Full Read-Only Notifier admin UI.
//
// The project has no standalone babel config (babel options live inline in
// webpack.config.js), so we drive babel-jest with an isolated, inline preset
// set and configFile:false / babelrc:false to avoid picking up unrelated
// project babel config. SCSS modules resolve to identity-obj-proxy; the
// heavy/native dependencies (moonstone, CKEditor, react-i18next, apollo) are
// mocked under __mocks__ so unit tests stay fast and deterministic.
module.exports = {
    testEnvironment: 'jsdom',
    rootDir: '.',
    roots: ['<rootDir>/src/javascript'],
    testMatch: ['**/*.test.js', '**/*.test.jsx'],
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    transform: {
        '^.+\\.(js|jsx)$': ['babel-jest', {
            configFile: false,
            babelrc: false,
            presets: [
                ['@babel/preset-env', {targets: {node: 'current'}}],
                ['@babel/preset-react', {runtime: 'automatic'}]
            ]
        }]
    },
    moduleNameMapper: {
        // SCSS / CSS modules -> proxy that returns the class name as-is
        '\\.(scss|css)$': 'identity-obj-proxy',
        // CKEditor packages are bundled/federated at runtime; mock for unit tests
        '^@ckeditor/ckeditor5-react$': '<rootDir>/src/javascript/__mocks__/ckeditorReact.js',
        '^ckeditor5$': '<rootDir>/src/javascript/__mocks__/ckeditor5.js',
        '^@jahia/ckeditor5$': '<rootDir>/src/javascript/__mocks__/ckeditor5.js',
        // Moonstone pulls in heavy assets; provide light stubs
        '^@jahia/moonstone$': '<rootDir>/src/javascript/__mocks__/moonstone.js',
        '^react-i18next$': '<rootDir>/src/javascript/__mocks__/reactI18next.js',
        // The component imports Apollo hooks from @apollo/client; @apollo/react-hooks
        // is mapped to the same stub for compatibility.
        '^@apollo/client$': '<rootDir>/src/javascript/__mocks__/apolloReactHooks.js',
        '^@apollo/react-hooks$': '<rootDir>/src/javascript/__mocks__/apolloReactHooks.js'
    },
    clearMocks: true
};
