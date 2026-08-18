import { translations } from "../i18n/index.js";
import { showToast } from "../utils/index.js";
import {
  isHistoryUnlocked,
  isSettingsUnlocked,
  setHistoryUnlocked,
  setSettingsUnlocked,
} from "./core.js";

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

export function showPinModal(mode = "verify", currentLang = "en") {
  return new Promise((resolve) => {
    const pinOverlay = document.getElementById("pinModalOverlay");
    const pinTitle = document.getElementById("pinModalTitle");
    const pinDots = document.getElementById("pinDots");
    const pinCancelBtn = document.getElementById("pinCancelBtn");
    const pinBackspaceBtn = document.getElementById("pinBackspaceBtn");
    const keypad = pinOverlay?.querySelector(".pin-keypad");

    if (!pinOverlay || !pinDots || !keypad) {
      resolve(false);
      return;
    }

    const dots = pinDots.querySelectorAll(".pin-dot");
    let currentInput = "";
    let firstPin = "";
    let step = mode === "setup" ? "first" : "verify";

    const updateTitle = () => {
      const langDict = translations[currentLang] || translations["en"];
      if (step === "verify") {
        pinTitle.textContent =
          langDict["pin-enter-title"] || "Enter 4-Digit PIN";
      } else if (step === "first") {
        pinTitle.textContent =
          langDict["pin-set-title"] || "Set New 4-Digit PIN";
      } else if (step === "confirm") {
        pinTitle.textContent =
          langDict["pin-confirm-title"] || "Confirm 4-Digit PIN";
      }
    };

    const updateDots = () => {
      dots.forEach((dot, idx) => {
        dot.classList.toggle("filled", idx < currentInput.length);
      });
    };

    const cleanup = () => {
      keypad.removeEventListener("click", handleKeyClick);
      pinBackspaceBtn?.removeEventListener("click", handleBackspace);
      pinCancelBtn?.removeEventListener("click", handleCancel);
    };

    const closePinModal = (result) => {
      cleanup();
      pinOverlay.classList.add("hidden");
      pinOverlay.style.display = "none";
      resolve(result);
    };

    const processPin = () => {
      const savedPin = localStorage.getItem("mori_pin");
      const langDict = translations[currentLang] || translations["en"];

      if (step === "verify") {
        if (currentInput === savedPin) {
          closePinModal(true);
        } else {
          showToast(langDict["toast-pin-incorrect"] || "Incorrect PIN!");
          currentInput = "";
          updateDots();
        }
      } else if (step === "first") {
        firstPin = currentInput;
        currentInput = "";
        step = "confirm";
        updateTitle();
        updateDots();
      } else if (step === "confirm") {
        if (currentInput === firstPin) {
          localStorage.setItem("mori_pin", currentInput);
          showToast(langDict["toast-pin-saved"] || "PIN saved successfully");
          closePinModal(true);
        } else {
          showToast(langDict["toast-pin-mismatch"] || "PINs do not match!");
          currentInput = "";
          firstPin = "";
          step = "first";
          updateTitle();
          updateDots();
        }
      }
    };

    const handleKeyClick = (e) => {
      const btn = e.target.closest(".pin-key");
      if (!btn) return;

      const key = btn.getAttribute("data-key");
      if (key !== null && key !== undefined) {
        if (currentInput.length < 4) {
          currentInput += key;
          updateDots();
          if (currentInput.length === 4) {
            setTimeout(processPin, 150);
          }
        }
      }
    };

    const handleBackspace = () => {
      if (currentInput.length > 0) {
        currentInput = currentInput.slice(0, -1);
        updateDots();
      }
    };

    const handleCancel = () => {
      closePinModal(false);
    };

    keypad.addEventListener("click", handleKeyClick);
    pinBackspaceBtn?.addEventListener("click", handleBackspace);
    pinCancelBtn?.addEventListener("click", handleCancel);

    updateTitle();
    updateDots();
    pinOverlay.classList.remove("hidden");
    pinOverlay.style.display = "flex";
  });
}

export async function verifyLock(
  reasonLabel = "label-biometric-reason",
  currentLang = "en",
) {
  const lockType = localStorage.getItem("mori_lock_type") || "none";
  if (lockType === "pin") {
    const hasPin = !!localStorage.getItem("mori_pin");
    if (!hasPin) {
      return await showPinModal("setup", currentLang);
    }
    return await showPinModal("verify", currentLang);
  } else if (lockType === "biometric") {
    return await verifyBiometric(reasonLabel, currentLang);
  }
  return true;
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

      if (!isChecked && currentLockType !== "none") {
        const verified = await verifyLock(
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
        setHistoryUnlocked(false);
        setSettingsUnlocked(false);
        if (currentLockType === "none") {
          const hasPin = !!localStorage.getItem("mori_pin");
          const defaultType = hasPin ? "pin" : "biometric";
          localStorage.setItem("mori_lock_type", defaultType);
          if (lockTypeText) {
            lockTypeText.textContent =
              translations[currentLang][`lock-type-${defaultType}`] ||
              defaultType;
          }
        }
      } else {
        setHistoryUnlocked(true);
        setSettingsUnlocked(true);
      }

      const lang = translations[currentLang];
      showToast(
        isChecked ? lang["toast-privacy-on"] : lang["toast-privacy-off"],
      );
    });
  }

  if (lockTypeSelect) {
    const isNative = window.Capacitor?.isNativePlatform?.();
    if (!isNative && lockTypeMenu) {
      const bioItem = lockTypeMenu.querySelector('[data-value="biometric"]');
      if (bioItem) bioItem.style.display = "none";
      if (localStorage.getItem("mori_lock_type") === "biometric") {
        const hasPin = !!localStorage.getItem("mori_pin");
        localStorage.setItem("mori_lock_type", hasPin ? "pin" : "none");
      }
    }

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

        if (currentType !== "none" && type === "none") {
          const verified = await verifyLock(
            "label-biometric-reason",
            currentLang,
          );
          if (!verified) return;
        }

        if (type === "pin") {
          const hasPin = !!localStorage.getItem("mori_pin");
          if (!hasPin) {
            const setupSuccess = await showPinModal("setup", currentLang);
            if (!setupSuccess) return;
          }
        }

        localStorage.setItem("mori_lock_type", type);
        if (lockTypeText) lockTypeText.textContent = item.textContent;

        if (type !== "none") {
          localStorage.setItem("mori_privacy_lock", "true");
          if (privacyLockToggle) privacyLockToggle.checked = true;
          setHistoryUnlocked(false);
        } else {
          localStorage.setItem("mori_privacy_lock", "false");
          if (privacyLockToggle) privacyLockToggle.checked = false;
          setHistoryUnlocked(true);
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
          setHistoryUnlocked(false);
          setSettingsUnlocked(false);
        }
      },
    );
  }
}
