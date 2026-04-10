import gql from 'graphql-tag';

export const GET_FRONOTIFIER_SETTINGS = gql`
    query GetFronotifierSettings($siteKey: String!) {
        fronotifierSettings(siteKey: $siteKey) {
            contentOff
            contentOn
        }
    }
`;

export const UPDATE_FRONOTIFIER_SETTINGS = gql`
    mutation UpdateFronotifierSettings($siteKey: String!, $contentOff: String!, $contentOn: String!) {
        updateFronotifierSettings(siteKey: $siteKey, contentOff: $contentOff, contentOn: $contentOn)
    }
`;
