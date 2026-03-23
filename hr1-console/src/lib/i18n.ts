import { ja } from "./translations/ja";
import { en } from "./translations/en";

export type Locale = "ja" | "en";

const translations: Record<Locale, Record<string, string>> = {
  ja,
  en: en as Record<string, string>,
};

let currentLocale: Locale = "ja";

export function setLocale(locale: Locale) {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

export function t(key: string, fallback?: string): string {
  return translations[currentLocale][key] ?? translations["ja"][key] ?? fallback ?? key;
}
