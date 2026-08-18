// update.js — GitHub release check & about/share modals
import { translations } from "../i18n/index.js";
import { CapacitorHttp, Share, showToast } from "../utils/index.js";
import { showInfoModal } from "./modals.js";
import {
  APP_VERSION,
  UPDATE_CHECK_URL,
  REPO_URL,
  checkUpdateBtn,
  currentLang,
  openExternalUrl,
  howToUseBtn,
  aboutAppBtn,
  shareAppBtn,
} from "./core.js";

export function isNewerVersion(latest, current) {
  if (!latest || !current) return false;
  const parse = (v) => v.split(".").map((n) => parseInt(n, 10) || 0);
  const l = parse(latest);
  const c = parse(current);
  for (let i = 0; i < Math.max(l.length, c.length); i++) {
    const numL = l[i] || 0;
    const numC = c[i] || 0;
    if (numL > numC) return true;
    if (numL < numC) return false;
  }
  return false;
}

async function fetchLatestRelease() {
  let data;
  const tauriInvoke =
    window.__TAURI__?.core?.invoke ||
    window.__TAURI_INTERNALS__?.invoke ||
    window.__TAURI__?.invoke;

  if (CapacitorHttp) {
    const res = await CapacitorHttp.get({
      url: UPDATE_CHECK_URL,
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "Mori-App",
      },
    });
    data = typeof res.data === "string" ? JSON.parse(res.data) : res.data;
  } else if (tauriInvoke) {
    const res = await tauriInvoke("tauri_http_request", {
      url: UPDATE_CHECK_URL,
      method: "GET",
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": "Mori-App",
      },
    });
    const rawData = res?.data || res?.body || res;
    data = typeof rawData === "string" ? JSON.parse(rawData) : rawData;
  } else {
    const res = await fetch(UPDATE_CHECK_URL);
    data = await res.json();
  }
  return data;
}

export async function checkUpdate() {
  const actionLabel = checkUpdateBtn.querySelector(".action-label");
  actionLabel.textContent = translations[currentLang]["btn-processing"];

  try {
    const data = await fetchLatestRelease();
    const latest = (data?.tag_name || "").replace(/^v/i, "");

    if (latest && isNewerVersion(latest, APP_VERSION)) {
      actionLabel.textContent = translations[currentLang]["btn-update"];
      const lang = translations[currentLang];
      const title = lang["label-update-available"];
      const msg = `${lang["label-update-available"]} (v${latest})<br><br><span id="manualUpdateLink" style="color:var(--primary);text-decoration:underline;font-weight:600;cursor:pointer;">${lang["btn-update"] || "Open Repository"}</span>`;
      showInfoModal(title, msg);
      setTimeout(() => {
        const el = document.getElementById("manualUpdateLink");
        if (el)
          el.onclick = () => {
            openExternalUrl(REPO_URL);
          };
      }, 50);
    } else {
      actionLabel.textContent = translations[currentLang]["btn-check"];
      const lang = translations[currentLang];
      showInfoModal(lang["label-update"], `${lang["label-up-to-date"]}`);
    }
  } catch (e) {
    console.error("Update check failed:", e);
    actionLabel.textContent = translations[currentLang]["btn-check"];
    const lang = translations[currentLang];
    showInfoModal(
      lang["label-check-failed"] || "Check Failed",
      lang["label-check-failed-msg"] ||
        "Unable to reach GitHub. Check your connection and try again.",
    );
  }
}

export async function autoCheckUpdate() {
  if (localStorage.getItem("mori_auto_update") === "false") return;
  if (localStorage.getItem("mori_skip_auto_update")) return;

  try {
    const data = await fetchLatestRelease();
    const latest = (data?.tag_name || "").replace(/^v/i, "");

    if (latest && isNewerVersion(latest, APP_VERSION)) {
      const lang = translations[currentLang];
      const title = lang["label-update-available"];
      const msg = `<div style="text-align:center;padding:8px 0;"><span style="font-size:2rem;display:block;margin-bottom:8px;">🎉</span>${lang["label-update-available"]} <strong>v${latest}</strong><br><br><span id="autoUpdateLink" style="color:var(--primary);text-decoration:underline;font-weight:600;cursor:pointer;">${lang["btn-update"] || "Open Repository"}</span></div>`;
      showInfoModal(title, msg, {
        showDontShow: true,
        dontShowKey: "mori_skip_auto_update",
        dontShowLabel: lang["label-dont-show-again"] || "Don't show again",
      });
      setTimeout(() => {
        const el = document.getElementById("autoUpdateLink");
        if (el)
          el.onclick = () => {
            openExternalUrl(REPO_URL);
          };
      }, 50);
    }
  } catch (e) {
    console.warn("Auto update check failed:", e);
  }
}

checkUpdateBtn?.addEventListener("click", checkUpdate);
autoCheckUpdate();

howToUseBtn?.addEventListener("click", () => {
  const lang = translations[currentLang];
  const steps = lang["howtouse-steps"]
    .map((s, i) => `${i + 1}. ${s}`)
    .join("<br><br>");
  showInfoModal(lang["label-howtouse"], steps);
});

aboutAppBtn?.addEventListener("click", () => {
  const lang = translations[currentLang];
  showInfoModal(lang["label-about"], lang["about-text"]);
});

shareAppBtn?.addEventListener("click", async () => {
  const lang = translations[currentLang];
  if (window.Capacitor?.isNativePlatform?.() && Share) {
    await Share.share({
      title: "Mori App",
      text: lang["share-msg"],
      url: "https://github.com/coflyn/Mori",
      dialogTitle: "Share Mori",
    });
  } else {
    // Fallback for web
    if (navigator.share) {
      navigator.share({
        title: "Mori App",
        text: lang["share-msg"],
        url: "https://github.com/coflyn/Mori",
      });
    } else {
      showToast("Sharing not supported on this browser.");
    }
  }
});
