import { create } from "zustand";
import i18n from "@/i18n";

export type Locale = "en" | "si";

type LocaleState = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

function readStoredLocale(): Locale {
  if (typeof window === "undefined") {
    return "en";
  }
  return window.localStorage.getItem("pos-locale") === "si" ? "si" : "en";
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: readStoredLocale(),
  setLocale: (locale) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("pos-locale", locale);
    }
    void i18n.changeLanguage(locale);
    document.documentElement.lang = locale;
    set({ locale });
  },
}));
