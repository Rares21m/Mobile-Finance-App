import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { getLocales } from "expo-localization";

import ro from "./locales/ro.json";
import en from "./locales/en.json";

const deviceLanguage = getLocales()[0]?.languageCode || "ro";

i18n.use(initReactI18next).init({
    resources: {
        ro: { translation: ro },
        en: { translation: en },
    },
    lng: deviceLanguage,
    fallbackLng: "ro",
    interpolation: {
        escapeValue: false,
    },
});

export default i18n;
