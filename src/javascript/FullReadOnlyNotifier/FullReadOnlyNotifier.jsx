import React, {useEffect, useState} from 'react';
import {ApolloClient, ApolloProvider, InMemoryCache, useMutation, useQuery} from '@apollo/client';
import {Button, Field} from '@jahia/moonstone';
import {useTranslation} from 'react-i18next';
import {GET_FRONOTIFIER_SETTINGS, UPDATE_FRONOTIFIER_SETTINGS} from './FullReadOnlyNotifier.gql';
import styles from './FullReadOnlyNotifier.scss';

const client = new ApolloClient({
    uri: `${window.contextJsParameters.contextPath}/modules/graphql`,
    cache: new InMemoryCache(),
    credentials: 'same-origin'
});

const getSiteKey = () => {
    const parts = window.location.pathname
        .replace(/^\/jahia\/administration\//, '')
        .split('/')
        .filter(Boolean);
    return parts.length > 0 ? parts[0] : null;
};

const FronotifierForm = () => {
    const {t} = useTranslation('full-read-only-notifier');
    const siteKey = getSiteKey();
    const {data, loading, error} = useQuery(GET_FRONOTIFIER_SETTINGS, {
        variables: {siteKey},
        fetchPolicy: 'network-only'
    });
    const [contentOff, setContentOff] = useState('');
    const [contentOn, setContentOn] = useState('');
    const [saveStatus, setSaveStatus] = useState(null);
    const [updateSettings, {loading: saving}] = useMutation(UPDATE_FRONOTIFIER_SETTINGS);

    useEffect(() => {
        if (data?.fronotifierSettings) {
            setContentOff(data.fronotifierSettings.contentOff || '');
            setContentOn(data.fronotifierSettings.contentOn || '');
        }
    }, [data]);

    if (loading) {
        return <div className={styles.fron_loading}>{t('settings.loading')}</div>;
    }

    if (error) {
        return <div className={styles.fron_error}>{t('settings.error')}: {error.message}</div>;
    }

    const handleSave = async () => {
        setSaveStatus(null);
        try {
            const result = await updateSettings({variables: {siteKey, contentOff, contentOn}});
            setSaveStatus(result.data?.updateFronotifierSettings ? 'success' : 'error');
        } catch (err) {
            console.error('Failed to update Full Read-Only Notifier settings:', err);
            setSaveStatus('error');
        }
    };

    const handleCancel = () => {
        setContentOff(data?.fronotifierSettings?.contentOff || '');
        setContentOn(data?.fronotifierSettings?.contentOn || '');
        setSaveStatus(null);
    };

    return (
        <div>
            <div className={styles.fron_page_header}>
                <h2>{t('settings.title')} - {siteKey}</h2>
            </div>
            <div className={styles.fron_container}>
                <div className={styles.fron_intro}>
                    <p>{t('settings.intro')}</p>
                </div>

                {saveStatus === 'success' && (
                    <div className={`${styles.fron_alert} ${styles['fron_alert--success']}`}>
                        {t('settings.saved')}
                    </div>
                )}
                {saveStatus === 'error' && (
                    <div className={`${styles.fron_alert} ${styles['fron_alert--error']}`}>
                        {t('settings.saveError')}
                    </div>
                )}

                <div className={styles.fron_form}>
                    <Field label={t('settings.contentOff')} id="fron-content-off">
                        <textarea
                            id="fron-content-off"
                            className={styles.fron_textarea}
                            value={contentOff}
                            rows={6}
                            disabled={saving}
                            onChange={e => setContentOff(e.target.value)}
                        />
                    </Field>

                    <Field label={t('settings.contentOn')} id="fron-content-on">
                        <textarea
                            id="fron-content-on"
                            className={styles.fron_textarea}
                            value={contentOn}
                            rows={6}
                            disabled={saving}
                            onChange={e => setContentOn(e.target.value)}
                        />
                    </Field>

                    <div className={styles.fron_actions}>
                        <Button
                            label={saving ? t('settings.saving') : t('settings.save')}
                            variant="primary"
                            isDisabled={saving}
                            onClick={handleSave}
                        />
                        <Button
                            label={t('settings.cancel')}
                            variant="secondary"
                            isDisabled={saving}
                            onClick={handleCancel}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export const FullReadOnlyNotifier = () => (
    <ApolloProvider client={client}>
        <FronotifierForm/>
    </ApolloProvider>
);
