import { translations } from "../i18n/index.js";
import { showToast } from "../utils/index.js";
import {
  isHistoryUnlocked,
  isSettingsUnlocked,
  setHistoryUnlocked,
  setSettingsUnlocked,
} from "./core.js";

export async function hashPin(pin) {
  if (window.crypto?.subtle) {
    const buf = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode("mori:" + pin),
    );
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  let h = 0x811c9dc5;
  const s = "mori:" + pin;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return "fnv_" + h.toString(16);
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
      window.removeEventListener("keydown", handleKeyDown);
    };

    const closePinModal = (result) => {
      cleanup();
      pinOverlay.classList.add("hidden");
      pinOverlay.style.display = "none";
      resolve(result);
    };

    const processPin = async () => {
      const savedPin = localStorage.getItem("mori_pin");
      const langDict = translations[currentLang] || translations["en"];

      if (step === "verify") {
        const hashedInput = await hashPin(currentInput);
        if (currentInput === savedPin || hashedInput === savedPin) {
          if (savedPin === currentInput) {
            localStorage.setItem("mori_pin", hashedInput);
          }
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
          const hashed = await hashPin(currentInput);
          localStorage.setItem("mori_pin", hashed);
          localStorage.setItem("mori_privacy_lock", "true");
          localStorage.setItem("mori_lock_type", "pin");
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

    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        if (currentInput.length < 4) {
          currentInput += e.key;
          updateDots();
          if (currentInput.length === 4) {
            setTimeout(processPin, 150);
          }
        }
      } else if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        handleBackspace();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleCancel();
      }
    };

    keypad.addEventListener("click", handleKeyClick);
    pinBackspaceBtn?.addEventListener("click", handleBackspace);
    pinCancelBtn?.addEventListener("click", handleCancel);
    window.addEventListener("keydown", handleKeyDown);

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
  const initialLockType = localStorage.getItem("mori_lock_type") || "none";

  if (isPrivacyOnInitial && initialLockType !== "none") {
    setHistoryUnlocked(false);
    setSettingsUnlocked(false);
  } else {
    setHistoryUnlocked(true);
    setSettingsUnlocked(true);
  }

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

  const setPinBtn = document.getElementById("setPinBtn");
  if (setPinBtn) {
    setPinBtn.addEventListener("click", async () => {
      const hasPin = !!localStorage.getItem("mori_pin");
      if (hasPin) {
        const verified = await showPinModal("verify", currentLang);
        if (!verified) return;
      }
      await showPinModal("setup", currentLang);
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
          setSettingsUnlocked(false);
        } else {
          localStorage.setItem("mori_privacy_lock", "false");
          if (privacyLockToggle) privacyLockToggle.checked = false;
          setHistoryUnlocked(true);
          setSettingsUnlocked(true);
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

  const handleAutoLock = () => {
    if (localStorage.getItem("mori_privacy_lock") === "true") {
      setHistoryUnlocked(false);
      setSettingsUnlocked(false);
    }
  };

  // Auto-lock on Mobile app pause
  if (window.Capacitor?.Plugins?.App) {
    window.Capacitor.Plugins.App.addListener(
      "appStateChange",
      ({ isActive }) => {
        if (!isActive) handleAutoLock();
      },
    );
  }
}
