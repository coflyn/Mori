// modals.js — custom confirm & info modals
import { stopAllMedia } from "../utils/index.js";
// DOM refs (queried locally, same pattern as authManager)
const confirmOverlay = document.getElementById("confirmOverlay");
const confirmTitle = document.getElementById("confirmTitle");
const confirmMessage = document.getElementById("confirmMessage");
const okConfirmBtn = document.getElementById("okConfirmBtn");
const cancelConfirmBtn = document.getElementById("cancelConfirmBtn");
const infoOverlay = document.getElementById("infoOverlay");
const infoTitle = document.getElementById("infoTitle");
const infoMessage = document.getElementById("infoMessage");
const closeInfoModal = document.getElementById("closeInfoModal");
const infoDontShowAgain = document.getElementById("infoDontShowAgain");
const infoDontShowCheckbox = document.getElementById("infoDontShowCheckbox");
const infoDontShowLabel = document.getElementById("infoDontShowLabel");

export const hideConfirm = () => {
  if (confirmOverlay) {
    confirmOverlay.classList.add("hidden");
    confirmOverlay.style.display = "none";
    // Reset to prevent stale closures from previous server prompts
    confirmOverlay._onDismissOutside = null;
  }
  if (cancelConfirmBtn) cancelConfirmBtn.textContent = "CANCEL";
  if (okConfirmBtn) {
    okConfirmBtn.textContent = "CONFIRM";
    okConfirmBtn.style.color = "";
  }
};

export function showConfirm(title, message, onConfirm, onCancel = null) {
  confirmTitle.innerHTML = title;
  confirmMessage.innerHTML = message;
  confirmOverlay.classList.remove("hidden");
  confirmOverlay.style.display = "flex";

  okConfirmBtn.onclick = () => {
    onConfirm();
    hideConfirm();
  };

  cancelConfirmBtn.onclick = () => {
    if (onCancel) onCancel();
    hideConfirm();
  };

  // Reset button states when showing
  cancelConfirmBtn.classList.remove("hidden");
  okConfirmBtn.textContent = "CONFIRM";
  okConfirmBtn.style.color = "";
}

export function showInfoModal(title, message, options = {}) {
  if (!infoOverlay) return;
  infoTitle.textContent = title;
  infoMessage.innerHTML = message;

  // Handle "Don't show again" checkbox
  if (options.showDontShow) {
    infoDontShowAgain?.classList.remove("hidden");
    infoDontShowCheckbox.checked = false;
    if (infoDontShowLabel) {
      infoDontShowLabel.textContent =
        options.dontShowLabel || "Don't show again";
    }
    // Store flag on close if checked
    const origClose = () => infoOverlay.classList.add("hidden");
    const closeWithCheck = () => {
      if (infoDontShowCheckbox.checked && options.dontShowKey) {
        localStorage.setItem(options.dontShowKey, "true");
      }
      origClose();
    };
    closeInfoModal.onclick = closeWithCheck;
  } else {
    infoDontShowAgain?.classList.add("hidden");
    closeInfoModal.onclick = () => infoOverlay.classList.add("hidden");
  }

  infoOverlay.classList.remove("hidden");
}

// The close handler is now managed inside showInfoModal via options.
// Clicking the overlay background still dismisses.
infoOverlay?.addEventListener("click", (e) => {
  if (e.target === infoOverlay) infoOverlay.classList.add("hidden");
});

// Modal close handling (delegated to this module)
export const hideModal = () => {
  const slidesWrapper = document.getElementById("modalSlidesWrapper");
  if (slidesWrapper) {
    stopAllMedia(slidesWrapper);
    slidesWrapper.innerHTML = "";
  }
  const modalOverlay = document.getElementById("modalOverlay");
  if (modalOverlay) {
    modalOverlay.classList.add("hidden");
    modalOverlay.style.display = "none";
  }
};

document.getElementById("closeModal")?.addEventListener("click", hideModal);
document.getElementById("modalOverlay")?.addEventListener("click", (e) => {
  if (e.target === document.getElementById("modalOverlay")) hideModal();
});
confirmOverlay?.addEventListener("click", (e) => {
  if (e.target === confirmOverlay) {
    if (typeof confirmOverlay._onDismissOutside === "function") {
      confirmOverlay._onDismissOutside();
    } else {
      hideConfirm();
    }
  }
});
