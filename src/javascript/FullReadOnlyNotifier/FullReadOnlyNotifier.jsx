import React, {useEffect, useMemo, useRef, useState} from 'react';
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

// Delay (ms) before the live-region message is set after a save resolves.
// Kept minimal; the remount key (see liveKey) is what guarantees the
// announcement, so this is only a small buffer to let React commit the reset.
const LIVE_REGION_ANNOUNCE_DELAY_MS = 50;

// Builds the CKEditor configuration. It is parameterised by the UI language and
// a per-instance accessible toolbar label so the two editors are distinguishable
// to assistive technology. IMPORTANT: this object must NOT be recreated on every
// keystroke — callers memoise it (useMemo keyed on i18n.language), because
// re-passing a new config object to <CKEditor> would tear down and rebuild the
// editor instance and lose focus/selection.
const buildEditorConfig = (language, toolbarAriaLabel) => ({
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
        shouldNotGroupWhenFull: true,
        // Distinct accessible name so screen readers can tell the two editor
        // toolbars apart (one for the "off" message, one for the "on" message).
        ariaLabel: toolbarAriaLabel
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
    language,
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
});

export const getSiteKey = () => {
    const parts = window.location.pathname
        .replace(/^\/jahia\/administration\//, '')
        .split('/')
        .filter(Boolean);
    return parts.length > 0 ? parts[0] : null;
};

const ERROR_REGION_ID = 'fron-error-region';
const CONTENT_OFF_LABEL_ID = 'fron-label-content-off';
const CONTENT_ON_LABEL_ID = 'fron-label-content-on';

export const FronotifierForm = () => {
    const {t, i18n} = useTranslation('full-read-only-notifier');
    const siteKey = getSiteKey();

    // Memoise the two editor configs so they are stable across keystrokes and
    // only rebuilt when the UI language changes. Each gets a distinct toolbar
    // accessible name so screen readers can tell the two editors apart.
    const editorConfigOff = useMemo(
        () => buildEditorConfig(i18n.language, t('settings.contentOff')),
        [i18n.language, t]
    );
    const editorConfigOn = useMemo(
        () => buildEditorConfig(i18n.language, t('settings.contentOn')),
        [i18n.language, t]
    );

    const {data, loading, error} = useQuery(GET_FRONOTIFIER_SETTINGS, {
        variables: {siteKey},
        // Skip the query entirely when the site key is missing — siteKey is
        // String! so firing with null would error at the GraphQL layer.
        skip: !siteKey,
        fetchPolicy: 'network-only'
    });
    const [contentOff, setContentOff] = useState('');
    const [contentOn, setContentOn] = useState('');
    const [saveStatus, setSaveStatus] = useState(null);
    // Single stable live-region message. liveKey increments on every save/cancel
    // so React remounts the region and the message is reliably re-announced,
    // instead of the clear-then-set-after-timeout dance.
    const [liveMsg, setLiveMsg] = useState('');
    const [liveKey, setLiveKey] = useState(0);
    const [updateSettings, {loading: saving}] = useMutation(UPDATE_FRONOTIFIER_SETTINGS);
    const editorOffRef = useRef(null);
    const editorOnRef = useRef(null);
    const headingRef = useRef(null);
    const mountedRef = useRef(true);
    const announceTimerRef = useRef(null);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            if (announceTimerRef.current) {
                clearTimeout(announceTimerRef.current);
            }
        };
    }, []);

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

    // Move focus to the heading once the form is rendered (after loading
    // resolves) so keyboard/screen-reader users land at the top of the panel.
    useEffect(() => {
        if (!loading && !error && siteKey && headingRef.current) {
            headingRef.current.focus();
        }
    }, [loading, error, siteKey]);

    useEffect(() => {
        const invalid = saveStatus === 'error' ? 'true' : 'false';
        [editorOffRef, editorOnRef].forEach(ref => {
            if (ref.current) {
                ref.current.editing.view.change(writer => {
                    const root = ref.current.editing.view.document.getRoot();
                    writer.setAttribute('aria-invalid', invalid, root);
                    if (saveStatus === 'error') {
                        writer.setAttribute('aria-errormessage', ERROR_REGION_ID, root);
                    } else {
                        writer.removeAttribute('aria-errormessage', root);
                    }
                });
            }
        });
    }, [saveStatus]);

    // Announce a live-region message after a short, named delay, guarding
    // against the component being unmounted before the timer fires.
    const announce = message => {
        if (announceTimerRef.current) {
            clearTimeout(announceTimerRef.current);
        }

        announceTimerRef.current = setTimeout(() => {
            if (mountedRef.current) {
                setLiveMsg(message);
                setLiveKey(key => key + 1);
            }
        }, LIVE_REGION_ANNOUNCE_DELAY_MS);
    };

    if (!siteKey) {
        return <div className={styles.fron_error} role="alert">{t('settings.noSiteKey')}</div>;
    }

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
            announce(newStatus === 'success' ? t('settings.saved') : t('settings.saveError'));
        } catch {
            // Rely on the UI error state (saveStatus + live region) rather than
            // logging to the console.
            setSaveStatus('error');
            announce(t('settings.saveError'));
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
        announce(t('settings.cancelled'));
    };

    return (
        <div className={styles.fron_wrapper}>
            {/*
              * Stable status region. The key forces a remount on every save/cancel
              * so assistive tech reliably re-announces the (possibly repeated) message.
              */}
            <output
                key={liveKey}
                role="status"
                aria-live="polite"
                aria-atomic="true"
                className={styles.fron_sr_only}
            >
                {liveMsg}
            </output>
            <div id={ERROR_REGION_ID} role="alert" aria-live="assertive" aria-atomic="true" className={styles.fron_sr_only}>
                {saveStatus === 'error' ? t('settings.saveError') : ''}
            </div>

            <div className={styles.fron_page_header}>
                <h2 ref={headingRef} tabIndex={-1}>{t('settings.title')} - {siteKey}</h2>
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
                      * CKEditor renders a contenteditable div; Field's htmlFor cannot associate
                      * with a contenteditable, so we expose a real visible label element with a
                      * stable id and point the editable at it via aria-labelledby (set in onReady).
                      */}
                    <Field label={<span id={CONTENT_OFF_LABEL_ID}>{t('settings.contentOff')}</span>}>
                        <div
                            className={`${styles.fron_editor} ${saving ? styles['fron_editor--disabled'] : ''}`}
                            {...(saving ? {inert: ''} : {})}
                        >
                            <CKEditor
                                editor={ClassicEditor}
                                config={editorConfigOff}
                                disabled={saving}
                                data={contentOff}
                                onReady={editor => {
                                    editorOffRef.current = editor;
                                    editor.editing.view.change(writer => {
                                        const root = editor.editing.view.document.getRoot();
                                        writer.setAttribute('aria-labelledby', CONTENT_OFF_LABEL_ID, root);
                                        writer.setAttribute('aria-label', t('settings.contentOff'), root);
                                        writer.setAttribute('aria-required', 'true', root);
                                        writer.setAttribute('aria-describedby', ERROR_REGION_ID, root);
                                    });
                                }}
                                onChange={(event, editor) => setContentOff(editor.getData())}
                            />
                        </div>
                    </Field>

                    <Field label={<span id={CONTENT_ON_LABEL_ID}>{t('settings.contentOn')}</span>}>
                        <div
                            className={`${styles.fron_editor} ${saving ? styles['fron_editor--disabled'] : ''}`}
                            {...(saving ? {inert: ''} : {})}
                        >
                            <CKEditor
                                editor={ClassicEditor}
                                config={editorConfigOn}
                                disabled={saving}
                                data={contentOn}
                                onReady={editor => {
                                    editorOnRef.current = editor;
                                    editor.editing.view.change(writer => {
                                        const root = editor.editing.view.document.getRoot();
                                        writer.setAttribute('aria-labelledby', CONTENT_ON_LABEL_ID, root);
                                        writer.setAttribute('aria-label', t('settings.contentOn'), root);
                                        writer.setAttribute('aria-required', 'true', root);
                                        writer.setAttribute('aria-describedby', ERROR_REGION_ID, root);
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
