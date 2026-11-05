import { CapacitorHttp, showToast } from "../utils/index.js";
import { APP_VERSION, GITHUB_REPO, currentLang } from "./core.js";
import { translations, t } from "../i18n/index.js";
import { showInfoModal, showConfirm } from "./modals.js";
import { BUNDLED_SCRAPER_VERSION } from "../scrapers/index.js";

export const SCRAPER_VERSION_URL = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/public/scrapers-version.json`;
export const SCRAPER_BIN_URL = `https://raw.githubusercontent.com/${GITHUB_REPO}/main/public/js/scrapers/bundle.js`;


export const ACTIVE_SCRAPER_VERSION_KEY = "mori_active_scraper_version";
export const PATCHED_SCRAPER_BIN_KEY = "mori_patched_scraper_bin";
export const LAST_SCRAPER_CHECK_KEY = "mori_last_scraper_check";

export function getActiveScraperVersion() {
  const localVer = parseInt(
    localStorage.getItem(ACTIVE_SCRAPER_VERSION_KEY),
    10,
  );
  if (!isNaN(localVer) && localVer > 0) return localVer;
  if (typeof BUNDLED_SCRAPER_VERSION === "number") {
    return BUNDLED_SCRAPER_VERSION;
  }
  if (typeof window.__MORI_BUNDLED_SCRAPER_VERSION__ === "number") {
    return window.__MORI_BUNDLED_SCRAPER_VERSION__;
  }
  return 2;
}

async function fetchRemoteJson(url) {
  if (CapacitorHttp) {
    const res = await CapacitorHttp.get({
      url,
      headers: {
        Accept: "application/json",
        "User-Agent": "Mori-App",
        "Cache-Control": "no-cache",
      },
    });
    return typeof res.data === "string" ? JSON.parse(res.data) : res.data;
  } else {
    const res = await fetch(url, { cache: "no-store" });
    return await res.json();
  }
}

async function fetchRemoteText(url) {
  if (CapacitorHttp) {
    const res = await CapacitorHttp.get({
      url,
      headers: { "Cache-Control": "no-cache", "User-Agent": "Mori-App" },
    });
    return typeof res.data === "string" ? res.data : JSON.stringify(res.data);
  } else {
    const res = await fetch(url, { cache: "no-store" });
    return res.text();
  }
}

export async function downloadAndApplyScraperPatch(remoteVer, bundleUrl) {
  const jsText = await fetchRemoteText(bundleUrl || SCRAPER_BIN_URL);
  if (!jsText || jsText.length < 500) {
    throw new Error("Downloaded bundle.js is corrupted or too small");
  }

  localStorage.setItem(PATCHED_SCRAPER_BIN_KEY, jsText);
  localStorage.setItem(ACTIVE_SCRAPER_VERSION_KEY, remoteVer.toString());
  updateScraperVersionUI(remoteVer);
  return true;
}


export async function checkScraperUpdate(isManual = false) {
  const updateScrapersBtn = document.getElementById("checkScraperUpdateBtn");
  const actionLabel = updateScrapersBtn?.querySelector(".action-label");
  const origText = actionLabel?.textContent;

  if (isManual && actionLabel) {
    actionLabel.textContent =
      translations[currentLang]?.["btn-processing"] || "CHECKING...";
  }

  try {
    const remoteManifest = await fetchRemoteJson(SCRAPER_VERSION_URL);
    if (!remoteManifest || typeof remoteManifest.scraperVersion !== "number") {
      throw new Error("Invalid manifest payload");
    }

    const currentVer = getActiveScraperVersion();
    const remoteVer = remoteManifest.scraperVersion;

    localStorage.setItem(LAST_SCRAPER_CHECK_KEY, Date.now().toString());

    if (remoteVer > currentVer) {
      if (actionLabel) {
        actionLabel.textContent =
          translations[currentLang]?.["btn-update"] || "UPDATE";
      }
      const skipKey = `mori_skip_scraper_update_v${remoteVer}`;
      if (!isManual && localStorage.getItem(skipKey)) {
        return;
      }

      const lang = translations[currentLang] || {};
      const title =
        lang["label-scraper-update-available"] || "Scraper Update Available";
      const changelogHtml = remoteManifest.changelog
        ? `<div style="font-size:0.85rem;margin:8px 0;padding:8px 12px;background:rgba(128,128,128,0.12);border-radius:8px;text-align:left;line-height:1.4;"><strong>Changelog:</strong><br>${remoteManifest.changelog}</div>`
        : "";

      const msg = `
        <div style="text-align:center;padding:4px 0;">
          <div>${lang["label-scraper-updated-desc"] || "New Scraper Core is available:"} <strong>v${remoteVer}</strong> (Current: v${currentVer})</div>
          ${changelogHtml}
          <div style="margin-top:14px;">
            <button id="applyScraperUpdateBtn" class="primary-btn" style="width:100%;padding:10px 16px;border-radius:8px;font-weight:600;cursor:pointer;border:none;background:var(--primary);color:#fff;">
              ${lang["btn-update"] || "UPDATE NOW"}
            </button>
          </div>
        </div>
      `;

      showInfoModal(title, msg, {
        showDontShow: !isManual,
        dontShowKey: skipKey,
        dontShowLabel: lang["label-dont-show-again"] || "Don't show again",
      });

      setTimeout(() => {
        const btn = document.getElementById("applyScraperUpdateBtn");
        if (btn) {
          btn.onclick = async () => {
            btn.disabled = true;
            btn.textContent = lang["btn-processing"] || "Downloading...";
            try {
              await downloadAndApplyScraperPatch(
                remoteVer,
                remoteManifest.binUrl,
              );
              btn.textContent = "DONE! Reloading...";
              showToast?.(`Scraper updated to v${remoteVer}`);
              setTimeout(() => {
                window.location.reload();
              }, 600);
            } catch (err) {
              console.error("[Mori Scrapers OTA] Patch apply failed:", err);
              btn.disabled = false;
              btn.textContent = lang["btn-update"] || "UPDATE NOW";
              showToast?.("Failed to download scraper update");
            }
          };
        }
      }, 50);
    } else {
      if (actionLabel) actionLabel.textContent = origText;
      updateScraperVersionUI(currentVer);
      if (isManual) {
        const lang = translations[currentLang] || {};
        const title = lang["label-scraper-uptodate-title"] || "Scraper Core";
        const hasPatch = !!localStorage.getItem(PATCHED_SCRAPER_BIN_KEY);

        let desc = `${lang["label-scraper-uptodate-desc"] || "Scraper core is already up to date."} (v${currentVer})`;
        if (hasPatch) {
          desc += `<br><br><span id="rollbackScraperLink" style="color:var(--primary);text-decoration:underline;font-weight:600;cursor:pointer;">${lang["btn-reset-default"] || "RESET TO DEFAULT"}</span>`;
        }
        showInfoModal(title, desc);

        if (hasPatch) {
          setTimeout(() => {
            const rollbackBtn = document.getElementById("rollbackScraperLink");
            if (rollbackBtn) {
              rollbackBtn.onclick = () => {
                promptResetScraper();
              };
            }
          }, 50);
        }
      }
    }
  } catch (err) {
    console.warn("[Mori Scrapers OTA] Check failed:", err);
    if (actionLabel) actionLabel.textContent = origText;
    if (isManual) {
      const lang = translations[currentLang] || {};
      const title = lang["label-check-failed"] || "Check Failed";
      const hasPatch = !!localStorage.getItem(PATCHED_SCRAPER_BIN_KEY);
      let desc =
        lang["label-check-failed-msg"] ||
        "Unable to reach update server. Please check your internet connection.";
      if (hasPatch) {
        desc += `<br><br><span id="rollbackScraperLinkErr" style="color:var(--primary);text-decoration:underline;font-weight:600;cursor:pointer;">${lang["btn-reset-default"] || "RESET TO DEFAULT"}</span>`;
      }
      showInfoModal(title, desc);

      if (hasPatch) {
        setTimeout(() => {
          const rollbackBtn = document.getElementById("rollbackScraperLinkErr");
          if (rollbackBtn) {
            rollbackBtn.onclick = () => {
              promptResetScraper();
            };
          }
        }, 50);
      }
    }
  }
}

export function promptResetScraper() {
  const lang = translations[currentLang] || {};
  showConfirm(
    lang["label-scraper-version"] || "Scraper Core",
    lang["confirm-reset-scraper"] || "Reset scraper core back to bundled baseline version? Any downloaded OTA patch will be removed.",
    () => {
      resetScrapersToDefault();
    }
  );
}

export function resetScrapersToDefault() {
  localStorage.removeItem(PATCHED_SCRAPER_BIN_KEY);
  localStorage.removeItem(ACTIVE_SCRAPER_VERSION_KEY);
  updateScraperVersionUI();
  showToast?.("Scraper reset to default. Reloading...");
  setTimeout(() => window.location.reload(), 600);
}

export function updateScraperVersionUI(ver) {
  const currentVer = ver || getActiveScraperVersion();
  const el = document.getElementById("scraperVersionVal");
  if (el) {
    el.textContent = `v${currentVer}`;
  }
}

export function initScraperAutoCheck() {
  updateScraperVersionUI();
  setTimeout(() => {
    checkScraperUpdate(false);
  }, 1500);
}
