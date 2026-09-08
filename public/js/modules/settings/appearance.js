// appearance.js — theme, colors, typography, and visual presets
import { translations } from "../../i18n/index.js";
import { showToast } from "../../utils/index.js";
import { currentLang, darkModeToggle } from "../core.js";
import { syncSettingToNative } from "./nativeSync.js";

const accentColors = {
  black: { light: "#1a1917", dark: "#fffbf2" },
};

export function applyColorAccent() {
  const theme = localStorage.getItem("mori_theme") || "light";
  const color = accentColors.black[theme] || "#1a1917";
  document.documentElement.style.setProperty("--primary", color);
}

export function applyFont() {
  if (!document.body) return;
  const font = localStorage.getItem("mori_font") || "display";
  document.body.className = (document.body.className || "").replace(
    /\bfont-\S+/g,
    "",
  );
  document.body.classList.add(`font-${font}`);
}

export function applyAnimSpeed() {
  if (!document.body) return;
  const speed = localStorage.getItem("mori_anim_speed") || "normal";
  document.body.classList.remove(
    "anim-off",
    "anim-slow",
    "anim-normal",
    "anim-fast",
  );
  document.body.classList.add(`anim-${speed}`);
}

export function applyTextSize() {
  const size = localStorage.getItem("mori_text_size") || "medium";
  const fontSizeMap = { small: "14px", medium: "16px", large: "18px" };
  document.documentElement.style.fontSize = fontSizeMap[size] || "16px";
  document.body.classList.remove("text-small", "text-medium", "text-large");
  document.body.classList.add(`text-${size}`);
}

export function applyGlassmorphism() {
  if (!document.body) return;
  const mode = localStorage.getItem("mori_glassmorphism") || "subtle";
  document.body.classList.remove("glass-off", "glass-subtle", "glass-deep");
  document.body.classList.add(`glass-${mode}`);
}

export function applyUiCorner() {
  if (!document.body) return;
  const corner = localStorage.getItem("mori_ui_corner") || "modern";
  document.body.classList.remove(
    "corner-sharp",
    "corner-modern",
    "corner-round",
  );
  document.body.classList.add(`corner-${corner}`);
}

/**
 * Initializes theme, typography, presets, and toggle listeners
 */
export function initAppearance() {
  // 1. Theme initialization
  const savedTheme = localStorage.getItem("mori_theme") || "light";
  document.documentElement.setAttribute("data-theme", savedTheme);
  if (darkModeToggle) darkModeToggle.checked = savedTheme === "dark";

  darkModeToggle?.addEventListener("change", (e) => {
    const theme = e.target.checked ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("mori_theme", theme);
    syncSettingToNative("mori_theme", theme);
    applyColorAccent();
    const lang = translations[currentLang] || translations.en;
    showToast(
      e.target.checked
        ? lang["toast-darkmode-on"] || "Dark mode enabled"
        : lang["toast-darkmode-off"] || "Light mode enabled",
    );
  });

  // 2. Compact mode initialization
  const compactModeToggle = document.getElementById("compactModeToggle");
  if (compactModeToggle) {
    compactModeToggle.checked =
      localStorage.getItem("mori_compact_mode") === "true";
    if (compactModeToggle.checked) document.body.classList.add("compact-mode");
    compactModeToggle.addEventListener("change", (e) => {
      localStorage.setItem("mori_compact_mode", e.target.checked);
      if (e.target.checked) {
        document.body.classList.add("compact-mode");
      } else {
        document.body.classList.remove("compact-mode");
      }
      const lang = translations[currentLang] || translations.en;
      showToast(
        e.target.checked
          ? lang["toast-compact-on"] || "Compact mode enabled"
          : lang["toast-compact-off"] || "Compact mode disabled",
      );
    });
  }

  // 3. Apply active visual presets
  applyColorAccent();
  applyFont();
  applyAnimSpeed();
  applyTextSize();
  applyGlassmorphism();
  applyUiCorner();
}
