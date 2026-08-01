import { translations } from "../i18n/index.js";
import { showToast, Filesystem, Share } from "../utils/index.js";
import { getHistory, saveHistory } from "./historyManager.js";

export const accentColors = {
  black: { light: "#1a1917", dark: "#fffbf2" },
};

export function applyColorAccent() {
  const theme = localStorage.getItem("mori_theme") || "light";
  const color = accentColors.black[theme];
  document.documentElement.style.setProperty("--primary", color);
}

export function applyFont() {
  const font = localStorage.getItem("mori_font") || "default";
  document.body.className = font !== "default" ? `font-${font}` : "";
}

export function exportMoriData() {
  try {
    const backup = {
      version: "4.2.0",
      timestamp: Date.now(),
      settings: { ...localStorage },
      history: getHistory(),
    };
    const jsonStr = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Mori_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Backup exported successfully!");
  } catch (e) {
    console.error("Export failed:", e);
    showToast("Export failed.");
  }
}

export function importMoriData(file, onComplete) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (data.settings) {
        Object.keys(data.settings).forEach((k) => {
          if (k.startsWith("mori_")) {
            localStorage.setItem(k, data.settings[k]);
          }
        });
      }
      if (data.history && Array.isArray(data.history)) {
        saveHistory(data.history);
      }
      showToast("Data imported successfully! Reloading...");
      setTimeout(() => location.reload(), 1200);
      if (onComplete) onComplete();
    } catch (err) {
      console.error("Import parse error:", err);
      showToast("Invalid backup file.");
    }
  };
  reader.readAsText(file);
}

export function initSettingsNavigation() {
  const settingsMainMenu = document.getElementById("settingsMainMenu");
  const settingsSubPages = document.querySelectorAll(".settings-sub-page");
  const settingsMenuItems = document.querySelectorAll(".settings-menu-item");
  const settingsBackBtns = document.querySelectorAll(".back-btn-settings");

  settingsMenuItems.forEach((item) => {
    item.addEventListener("click", () => {
      const targetId = item.getAttribute("data-target");
      settingsMainMenu?.classList.add("hidden");
      const targetPage = document.getElementById(targetId);
      if (targetPage) targetPage.classList.remove("hidden");
    });
  });

  settingsBackBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      settingsSubPages.forEach((p) => p.classList.add("hidden"));
      settingsMainMenu?.classList.remove("hidden");
    });
  });
}
