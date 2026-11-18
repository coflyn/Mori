import en from "./locales/en.js";
import id from "./locales/id.js";
import ja from "./locales/ja.js";
import ko from "./locales/ko.js";
import zh from "./locales/zh.js";
import ar from "./locales/ar.js";
import ru from "./locales/ru.js";
import tl from "./locales/tl.js";
import hi from "./locales/hi.js";
import es from "./locales/es.js";

export const translations = {
  en,
  id,
  ja,
  ko,
  zh,
  ar,
  ru,
  tl,
  hi,
  es,
};
export const SUPPORTED_LANGS = [
  "en",
  "id",
  "ja",
  "ko",
  "zh",
  "ar",
  "ru",
  "tl",
  "hi",
  "es",
];

/**
 * Detects device/browser language mapped to supported locales.
 * @returns {string} Supported language code (default 'en')
 */
export function detectSystemLanguage() {
  const navLangs =
    typeof navigator !== "undefined" && Array.isArray(navigator.languages) && navigator.languages.length
      ? navigator.languages
      : [typeof navigator !== "undefined" ? navigator.language : "en"];

  for (const raw of navLangs) {
    if (!raw) continue;
    const l = String(raw).toLowerCase();
    if (l.startsWith("zh")) return "zh";
    if (l.startsWith("id") || l.startsWith("in")) return "id";
    if (l.startsWith("ja")) return "ja";
    if (l.startsWith("ko")) return "ko";
    if (l.startsWith("ar")) return "ar";
    if (l.startsWith("ru")) return "ru";
    if (l.startsWith("tl") || l.startsWith("fil")) return "tl";
    if (l.startsWith("hi")) return "hi";
    if (l.startsWith("es")) return "es";
    if (l.startsWith("en")) return "en";
  }
  return "en";
}

/**
 * Gets initial language: stored preference or auto-detected system language.
 * Saves detected language to localStorage on first launch.
 * @returns {string}
 */
export function getInitialLanguage() {
  try {
    let lang = localStorage.getItem("mori_lang");
    if (!lang || !translations[lang]) {
      lang = detectSystemLanguage();
      localStorage.setItem("mori_lang", lang);
    }
    return lang;
  } catch {
    return detectSystemLanguage();
  }
}

/**
 * Translates a given key with automatic fallback to English and variable interpolation.
 *
 * @param {string} key - The translation key (e.g. "batch-download-all")
 * @param {Record<string, string|number>} [params] - Optional map of variables to replace (e.g. { count: 5 })
 * @param {string} [lang] - Optional explicit language code (defaults to stored/active language)
 * @returns {string} The translated string or the key if not found
 */
export function t(key, params = {}, lang = null) {
  const activeLang = lang || getInitialLanguage();
  let text =
    translations[activeLang]?.[key] ?? translations["en"]?.[key] ?? key;

  if (params && typeof params === "object") {
    for (const [k, v] of Object.entries(params)) {
      text = text.replaceAll(`\${${k}}`, String(v));
    }
  }
  return text;
}
