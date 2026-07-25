import { translations } from "../i18n/index.js";
import { showToast } from "../utils/index.js";

export let isHistoryUnlocked = false;
export let isSettingsUnlocked = false;

export function setHistoryUnlocked(state) {
  isHistoryUnlocked = state;
}

export function setSettingsUnlocked(state) {
  isSettingsUnlocked = state;
}

export async function verifyBiometric(
  reasonLabel = "label-biometric-reason",
  currentLang = "en",
) {
  try {
    const { NativeBiometric } = window.Capacitor?.Plugins || {};
    if (NativeBiometric) {
      const res = await NativeBiometric.isAvailable();
      if (res.isAvailable) {
        await NativeBiometric.verifyIdentity({
          reason:
            translations[currentLang][reasonLabel] || "Authentication required",
          title: "Mori Privacy Lock",
          subtitle: "",
          description: "",
        });
        return true;
      }
    }
  } catch (err) {
    console.error("Biometric verification failed:", err);
    return false;
  }
  return false;
}

export function initAuthListeners(currentLang = "en") {
  const privacyLockToggle = document.getElementById("privacyLockToggle");
  const lockTypeSelect = document.getElementById("lockTypeSelect");
  const lockTypeMenu = document.getElementById("lockTypeMenu");
  const lockTypeText = document.getElementById("lockTypeText");

  const isPrivacyOnInitial =
    localStorage.getItem("mori_privacy_lock") === "true";
  if (privacyLockToggle) {
    privacyLockToggle.checked = isPrivacyOnInitial;
    privacyLockToggle.addEventListener("change", async (e) => {
      const isChecked = e.target.checked;
      const currentLockType = localStorage.getItem("mori_lock_type") || "none";

      if (!isChecked && currentLockType === "biometric") {
        const verified = await verifyBiometric(
          "label-biometric-reason",
          currentLang,
        );
        if (!verified) {
          privacyLockToggle.checked = true;
          return;
        }
      }

      localStorage.setItem("mori_privacy_lock", isChecked ? "true" : "false");
      if (isChecked) {
        isHistoryUnlocked = false;
        isSettingsUnlocked = false;
        if (currentLockType === "none") {
          localStorage.setItem("mori_lock_type", "biometric");
          if (lockTypeText) {
            lockTypeText.textContent =
              translations[currentLang]["lock-type-biometric"] || "Biometric";
          }
        }
      } else {
        isHistoryUnlocked = true;
        isSettingsUnlocked = true;
      }

      const lang = translations[currentLang];
      showToast(
        isChecked ? lang["toast-privacy-on"] : lang["toast-privacy-off"],
      );
    });
  }

  if (lockTypeSelect) {
    const currentLock = localStorage.getItem("mori_lock_type") || "none";
    if (lockTypeText) {
      lockTypeText.textContent =
        translations[currentLang][`lock-type-${currentLock}`] || currentLock;
    }

    lockTypeSelect.addEventListener("click", (e) => {
      e.stopPropagation();
      lockTypeMenu?.classList.toggle("hidden");
    });

    document.addEventListener("click", () => {
      lockTypeMenu?.classList.add("hidden");
    });

    lockTypeMenu?.querySelectorAll(".dropdown-item").forEach((item) => {
      item.addEventListener("click", async () => {
        const type = item.getAttribute("data-value");
        const currentType = localStorage.getItem("mori_lock_type") || "none";

        if (type === currentType) return;

        if (currentType === "biometric" && type === "none") {
          const verified = await verifyBiometric(
            "label-biometric-reason",
            currentLang,
          );
          if (!verified) return;
        }

        localStorage.setItem("mori_lock_type", type);
        if (lockTypeText) lockTypeText.textContent = item.textContent;

        if (type === "biometric") {
          localStorage.setItem("mori_privacy_lock", "true");
          if (privacyLockToggle) privacyLockToggle.checked = true;
          isHistoryUnlocked = false;
        } else {
          localStorage.setItem("mori_privacy_lock", "false");
          if (privacyLockToggle) privacyLockToggle.checked = false;
          isHistoryUnlocked = true;
        }

        const lang = translations[currentLang];
        showToast(
          type === "none"
            ? lang["toast-privacy-off"]
            : lang["toast-privacy-on"],
        );
      });
    });
  }

  // Auto-lock when app pauses
  if (window.Capacitor?.Plugins?.App) {
    window.Capacitor.Plugins.App.addListener(
      "appStateChange",
      ({ isActive }) => {
        if (!isActive && localStorage.getItem("mori_privacy_lock") === "true") {
          isHistoryUnlocked = false;
          isSettingsUnlocked = false;
        }
      },
    );
  }
}
