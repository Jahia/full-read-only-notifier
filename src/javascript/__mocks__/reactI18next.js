// Mock for react-i18next: returns the translation key as the value and a
// stable i18n object with a settable language.
const i18n = {language: 'en'};

const useTranslation = () => ({
    t: key => key,
    i18n
});

module.exports = {useTranslation, __i18n: i18n};
