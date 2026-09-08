import en from "./locales/en.js";
import id from "./locales/id.js";
import ja from "./locales/ja.js";
import ko from "./locales/ko.js";
import zh from "./locales/zh.js";
import ar from "./locales/ar.js";
import ru from "./locales/ru.js";
import tl from "./locales/tl.js";
import hi from "./locales/hi.js";

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
};

/**
 * Translates a given key with automatic fallback to English and variable interpolation.
 *
 * @param {string} key - The translation key (e.g. "batch-download-all")
 * @param {Record<string, string|number>} [params] - Optional map of variables to replace (e.g. { count: 5 })
 * @param {string} [lang] - Optional explicit language code (defaults to stored/active language)
 * @returns {string} The translated string or the key if not found
 */

export function t(key, params = {}, lang = null) {
  const activeLang = lang || localStorage.getItem("mori_lang") || "en";
  let text =
    translations[activeLang]?.[key] ?? translations["en"]?.[key] ?? key;

  if (params && typeof params === "object") {
    for (const [k, v] of Object.entries(params)) {
      text = text.replaceAll(`\${${k}}`, String(v));
    }
  }
  return text;
}
