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
            // Block-level structural elements
            {name: 'div', attributes: ['id', 'class', 'lang', 'dir'], classes: true, styles: false},
            {name: 'section', attributes: ['id', 'class'], classes: true, styles: false},
            {name: 'article', attributes: ['id', 'class'], classes: true, styles: false},
            {name: 'header', attributes: ['id', 'class'], classes: true, styles: false},
            {name: 'footer', attributes: ['id', 'class'], classes: true, styles: false},
            {name: 'main', attributes: ['id', 'class'], classes: true, styles: false},
            {name: 'nav', attributes: ['id', 'class'], classes: true, styles: false},
            {name: 'aside', attributes: ['id', 'class'], classes: true, styles: false},
            // Inline text elements
            {name: 'span', attributes: ['id', 'class', 'lang', 'dir'], classes: true, styles: false},
            {name: 'abbr', attributes: ['title', 'class'], classes: true, styles: false},
            {name: 'cite', attributes: ['class'], classes: true, styles: false},
            {name: 'mark', attributes: ['class'], classes: true, styles: false},
            {name: 'small', attributes: ['class'], classes: true, styles: false},
            {name: 'time', attributes: ['datetime', 'class'], classes: true, styles: false},
            // Safe media: figures and images (no remote script surfaces)
            {name: 'figure', attributes: ['id', 'class'], classes: true, styles: false},
            {name: 'figcaption', attributes: ['class'], classes: true, styles: false},
            // Definition lists (not covered by the List plugin)
            {name: 'dl', attributes: ['class'], classes: true, styles: false},
            {name: 'dt', attributes: ['class'], classes: true, styles: false},
            {name: 'dd', attributes: ['class'], classes: true, styles: false}
        ],
        // Keep sandbox enabled (false would disable the sandbox on iframes)
        htmlIframeSandbox: ['allow-scripts', 'allow-same-origin']
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
    const [politeMsg, setPoliteMsg] = useState('');
    const [assertiveMsg, setAssertiveMsg] = useState('');
    const [updateSettings, {loading: saving}] = useMutation(UPDATE_FRONOTIFIER_SETTINGS);
    const editorOffRef = useRef(null);
    const editorOnRef = useRef(null);
    const errorRegionId = 'fron-error-region';

    useEffect(() => {
        if (data?.fronotifierSettings) {
            const off = data.fronotifierSettings.contentOff || '';
            const on = data.fronotifierSettings.contentOn || '';
            setContentOff(off);
            setContentOn(on);
        }
    }, [data]);

    useEffect(() => {
        document.title = t('settings.title');
    }, [t]);

    useEffect(() => {
        const invalid = saveStatus === 'error' ? 'true' : 'false';
        [editorOffRef, editorOnRef].forEach(ref => {
            if (ref.current) {
                ref.current.editing.view.change(writer => {
                    writer.setAttribute('aria-invalid', invalid, ref.current.editing.view.document.getRoot());
                });
            }
        });
    }, [saveStatus]);

    if (loading) {
        return <div className={styles.fron_loading} role="status">{t('settings.loading')}</div>;
    }

    if (error) {
        return <div className={styles.fron_error} role="alert">{t('settings.error')}: {error.message}</div>;
    }

    const handleSave = async () => {
        try {
            const result = await updateSettings({variables: {siteKey, contentOff, contentOn}});
            const newStatus = result.data?.updateFronotifierSettings ? 'success' : 'error';
            setSaveStatus(newStatus);
            if (newStatus === 'success') {
                setAssertiveMsg('');
                setPoliteMsg('');
                requestAnimationFrame(() => setTimeout(() => setPoliteMsg(t('settings.saved')), 100));
            } else {
                setPoliteMsg('');
                setAssertiveMsg('');
                requestAnimationFrame(() => setTimeout(() => setAssertiveMsg(t('settings.saveError')), 100));
            }
        } catch (err) {
            console.error('Failed to update Full Read-Only Notifier settings:', err);
            setSaveStatus('error');
            setPoliteMsg('');
            setAssertiveMsg('');
            requestAnimationFrame(() => setTimeout(() => setAssertiveMsg(t('settings.saveError')), 100));
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
        setAssertiveMsg('');
        setPoliteMsg('');
        requestAnimationFrame(() => setTimeout(() => setPoliteMsg(t('settings.cancelled')), 100));
    };

    return (
        <div className={styles.fron_wrapper}>
            <div role="status" aria-live="polite" aria-atomic="true" className={styles.fron_sr_only}>
                {politeMsg}
            </div>
            <div id={errorRegionId} role="alert" aria-live="assertive" aria-atomic="true" className={styles.fron_sr_only}>
                {assertiveMsg}
            </div>

            <div className={styles.fron_page_header}>
                <h2>{t('settings.title')} - {siteKey}</h2>
            </div>
            <div className={styles.fron_container}>
                <div className={styles.fron_intro}>
                    <p>{t('settings.intro')}</p>
                </div>

                {saveStatus === 'success' && (
                    <div aria-hidden="true" className={`${styles.fron_alert} ${styles['fron_alert--success']}`}>
                        {t('settings.saved')}
                    </div>
                )}
                {saveStatus === 'error' && (
                    <div aria-hidden="true" className={`${styles.fron_alert} ${styles['fron_alert--error']}`}>
                        {t('settings.saveError')}
                    </div>
                )}

                <div className={styles.fron_form}>
                    {/*
                      * CKEditor renders a contenteditable div; Field's htmlFor cannot associate with
                      * a contenteditable, so we omit the id prop and set aria-label on the editor
                      * editable via the onReady callback instead.
                      */}
                    <Field label={t('settings.contentOff')}>
                        <div
                            className={`${styles.fron_editor} ${saving ? styles['fron_editor--disabled'] : ''}`}
                            {...(saving ? {inert: ''} : {})}
                        >
                            <CKEditor
                                editor={ClassicEditor}
                                config={editorConfig}
                                disabled={saving}
                                data={contentOff}
                                onReady={editor => {
                                    editorOffRef.current = editor;
                                    editor.editing.view.change(writer => {
                                        const root = editor.editing.view.document.getRoot();
                                        writer.setAttribute('aria-label', t('settings.contentOff'), root);
                                        writer.setAttribute('aria-required', 'true', root);
                                        writer.setAttribute('aria-describedby', errorRegionId, root);
                                    });
                                }}
                                onChange={(event, editor) => setContentOff(editor.getData())}
                            />
                        </div>
                    </Field>

                    <Field label={t('settings.contentOn')}>
                        <div
                            className={`${styles.fron_editor} ${saving ? styles['fron_editor--disabled'] : ''}`}
                            {...(saving ? {inert: ''} : {})}
                        >
                            <CKEditor
                                editor={ClassicEditor}
                                config={editorConfig}
                                disabled={saving}
                                data={contentOn}
                                onReady={editor => {
                                    editorOnRef.current = editor;
                                    editor.editing.view.change(writer => {
                                        const root = editor.editing.view.document.getRoot();
                                        writer.setAttribute('aria-label', t('settings.contentOn'), root);
                                        writer.setAttribute('aria-required', 'true', root);
                                        writer.setAttribute('aria-describedby', errorRegionId, root);
                                    });
                                }}
                                onChange={(event, editor) => setContentOn(editor.getData())}
                            />
                        </div>
                    </Field>

                    <div className={styles.fron_actions}>
                        <Button
                            type="button"
                            label={saving ? t('settings.saving') : t('settings.save')}
                            variant="primary"
                            isDisabled={saving}
                            onClick={handleSave}
                        />
                        <Button
                            type="button"
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
