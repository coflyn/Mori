export const accentColors = {
  black: { light: "#1a1917", dark: "#fffbf2" },
};

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
