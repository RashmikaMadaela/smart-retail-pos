import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import enCommon from "../locales/en/common.json";
import siCommon from "../locales/si/common.json";

const savedLocale = (() => {
  if (typeof window === "undefined") {
    return "en";
  }
  const value = window.localStorage.getItem("pos-locale");
  return value === "si" ? "si" : "en";
})();

void i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: enCommon },
      si: { common: siCommon },
    },
    lng: savedLocale,
    fallbackLng: "en",
    defaultNS: "common",
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
