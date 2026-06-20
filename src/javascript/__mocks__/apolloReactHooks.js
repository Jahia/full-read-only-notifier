// Mock for Apollo hooks/provider. The component imports useQuery/useMutation/
// ApolloClient/ApolloProvider/InMemoryCache from @apollo/client; this single
// mock backs both that module and @apollo/react-hooks via moduleNameMapper.
//
// Tests override useQuery/useMutation with jest.spyOn on this module to drive
// the loading / success / error branches.
const React = require('react');

const useQuery = jest.fn(() => ({data: undefined, loading: false, error: undefined}));
const useMutation = jest.fn(() => [jest.fn(), {loading: false}]);

class ApolloClient {
    constructor() {}
}

class InMemoryCache {
    constructor() {}
}

const ApolloProvider = props => React.createElement(React.Fragment, null, props.children);

module.exports = {
    useQuery,
    useMutation,
    ApolloClient,
    InMemoryCache,
    ApolloProvider
};
