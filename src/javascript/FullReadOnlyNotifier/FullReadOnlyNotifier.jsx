import React, {useEffect, useRef, useState} from 'react';
import {ApolloClient, ApolloProvider, InMemoryCache, useMutation, useQuery} from '@apollo/client';
import {Button, Field} from '@jahia/moonstone';
import {CKEditor} from '@ckeditor/ckeditor5-react';
import {
    Alignment,
    Autoformat,
    BlockQuote,
    Bold,
    Bookmark,
    ClassicEditor,
    Clipboard,
    Code,
    CodeBlock,
    Essentials,
    FindAndReplace,
    Font,
    FontBackgroundColor,
    FontColor,
    FontFamily,
    FontSize,
    Fullscreen,
    GeneralHtmlSupport,
    Heading,
    HorizontalLine,
    Image,
    ImageCaption,
    ImageResize,
    ImageStyle,
    ImageToolbar,
    ImageUpload,
    Indent,
    IndentBlock,
    Italic,
    Link,
    LinkImage,
    List,
    ListProperties,
    Mention,
    Paragraph,
    PasteFromOffice,
    RemoveFormat,
    ShowBlocks,
    SourceEditing,
    SpecialCharacters,
    SpecialCharactersEssentials,
    Strikethrough,
    Style,
    Table,
    TableCellProperties,
    TableColumnResize,
    TableProperties,
    TableToolbar,
    TextTransformation,
    Underline
} from 'ckeditor5';
import {useTranslation} from 'react-i18next';
import {GET_FRONOTIFIER_SETTINGS, UPDATE_FRONOTIFIER_SETTINGS} from './FullReadOnlyNotifier.gql';
import styles from './FullReadOnlyNotifier.scss';

const client = new ApolloClient({
    uri: `${window.contextJsParameters.contextPath}/modules/graphql`,
    cache: new InMemoryCache(),
    credentials: 'same-origin'
});

const editorConfig = {
    licenseKey: 'GPL',
    plugins: [Alignment,
        Autoformat,
        BlockQuote,
        Bold,
        Bookmark,
        Clipboard,
        Code,
        CodeBlock,
        List,
        ListProperties,
        Essentials,
        FindAndReplace,
        FontBackgroundColor,
        Font,
        FontColor,
        FontFamily,
        FontSize,
        Fullscreen,
        GeneralHtmlSupport,
        Heading,
        HorizontalLine,
        Image,
        ImageCaption,
        ImageResize,
        ImageStyle,
        ImageToolbar,
        ImageUpload,
        Indent,
        IndentBlock,
        Italic,
        Link,
        LinkImage,
        List,
        Mention,
        Paragraph,
        PasteFromOffice,
        RemoveFormat,
        ShowBlocks,
        SourceEditing,
        Strikethrough,
        Style,
        SpecialCharacters,
        SpecialCharactersEssentials,
        Table,
        TableCellProperties,
        TableColumnResize,
        TableProperties,
        TableToolbar,
        TextTransformation,
        Underline],
    toolbar: {
        items: [
            'undo',
            'redo',
            'showBlocks',
            'fullScreen',
            '|',
            'heading',
            'style',
            '|',
            'bold',
            'italic',
            'removeFormat',
            '|',
            'alignment',
            '|',
            'insertJahiaImage',
            'link',
            'bookmark',
            'insertTable',
            '|',
            'bulletedList',
            'numberedList',
            'indent',
            'outdent',
            '|',
            'sourceEditing'
        ],
        shouldNotGroupWhenFull: true
    },
    menuBar: {isVisible: false},
    heading: {
        options: [
            {model: 'paragraph', title: 'Paragraph', class: 'ck-heading_paragraph'},
            {model: 'heading2', view: 'h2', title: 'Heading 2', class: 'ck-heading_heading2'},
            {model: 'heading3', view: 'h3', title: 'Heading 3', class: 'ck-heading_heading3'},
            {model: 'heading4', view: 'h4', title: 'Heading 4', class: 'ck-heading_heading4'}
        ]
    },
    language: 'en',
    image: {
        resizeUnit: 'px',
        toolbar: [
            'linkImage',
            '|',
            'toggleImageCaption',
            'imageTextAlternative',
            '|',
            'imageStyle:inline',
            'imageStyle:alignCenter',
            'imageStyle:wrapText',
            '|',
            'resizeImage:original',
            'resizeImage:custom'
        ]
    },
    table: {
        contentToolbar: [
            'tableColumn',
            'tableRow',
            'mergeTableCells',
            'tableCellProperties',
            'tableProperties'
        ]
    },
    htmlSupport: {
        allow: [
            {
                name: /.*/,
                attributes: true,
                classes: true,
                styles: true
            }
        ],
        htmlIframeSandbox: false
    },
    list: {
        properties: {
            styles: true,
            startIndex: true,
            reversed: false
        }
    },
    link: {
        toolbar: ['editLink', 'linkProperties', 'unlink'],
        defaultProtocol: 'https://',
        decorators: {
            openInNewTab: {
                mode: 'manual',
                label: 'Open in a new tab',
                defaultValue: false,
                attributes: {
                    target: '_blank',
                    rel: 'noopener noreferrer'
                }
            }
        }
    }
};

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
    const editorOffRef = useRef(null);
    const editorOnRef = useRef(null);

    useEffect(() => {
        if (data?.fronotifierSettings) {
            const off = data.fronotifierSettings.contentOff || '';
            const on = data.fronotifierSettings.contentOn || '';
            setContentOff(off);
            setContentOn(on);
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
        const off = data?.fronotifierSettings?.contentOff || '';
        const on = data?.fronotifierSettings?.contentOn || '';
        setContentOff(off);
        setContentOn(on);
        if (editorOffRef.current && editorOffRef.current.getData() !== off) {
            editorOffRef.current.setData(off);
        }

        if (editorOnRef.current && editorOnRef.current.getData() !== on) {
            editorOnRef.current.setData(on);
        }

        setSaveStatus(null);
    };

    return (
        <div className={styles.fron_wrapper}>
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
                        <div className={`${styles.fron_editor} ${saving ? styles['fron_editor--disabled'] : ''}`}>
                            <CKEditor
                                editor={ClassicEditor}
                                config={editorConfig}
                                disabled={saving}
                                data={contentOff}
                                onReady={editor => {
                                    editorOffRef.current = editor;
                                }}
                                onChange={(event, editor) => setContentOff(editor.getData())}
                            />
                        </div>
                    </Field>

                    <Field label={t('settings.contentOn')} id="fron-content-on">
                        <div className={`${styles.fron_editor} ${saving ? styles['fron_editor--disabled'] : ''}`}>
                            <CKEditor
                                editor={ClassicEditor}
                                config={editorConfig}
                                disabled={saving}
                                data={contentOn}
                                onReady={editor => {
                                    editorOnRef.current = editor;
                                }}
                                onChange={(event, editor) => setContentOn(editor.getData())}
                            />
                        </div>
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
