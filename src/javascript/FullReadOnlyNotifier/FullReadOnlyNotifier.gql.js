import gql from 'graphql-tag';

export const GET_FRONOTIFIER_SETTINGS = gql`
    query GetFronotifierSettings($siteKey: String!) {
        fullReadOnlyNotifier {
            settings(siteKey: $siteKey) {
                contentOff
                contentOn
            }
        }
    }
`;

export const UPDATE_FRONOTIFIER_SETTINGS = gql`
    mutation UpdateFronotifierSettings($siteKey: String!, $contentOff: String!, $contentOn: String!) {
        fullReadOnlyNotifier {
            updateSettings(siteKey: $siteKey, contentOff: $contentOff, contentOn: $contentOn)
        }
    }
`;
