(function () {
  const installButton = document.getElementById("install-app");
  const installModal = document.getElementById("install-modal");
  const closeInstallButton = document.getElementById("close-install");
  const mobileUrlWarning = document.getElementById("mobile-url-warning");
  let deferredInstallPrompt = null;

  function isStandalone() {
    return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  }

  function openInstallHelp() {
    if (!installModal) return;
    installModal.hidden = false;
    document.body.classList.add("modal-open");
  }

  function closeInstallHelp() {
    if (!installModal) return;
    installModal.hidden = true;
    document.body.classList.remove("modal-open");
  }

  if (installButton) {
    installButton.hidden = isStandalone();
  }

  if (mobileUrlWarning && window.location.protocol === "file:") {
    mobileUrlWarning.classList.add("is-visible");
  }

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    if (installButton) installButton.hidden = false;
  });

  if (installButton) {
    installButton.addEventListener("click", async () => {
      if (!deferredInstallPrompt) {
        openInstallHelp();
        return;
      }
      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      installButton.hidden = true;
    });
  }

  window.addEventListener("appinstalled", () => {
    deferredInstallPrompt = null;
    if (installButton) installButton.hidden = true;
  });

  if (closeInstallButton) {
    closeInstallButton.addEventListener("click", closeInstallHelp);
  }

  const installBackdrop = document.querySelector("[data-close-install]");
  if (installBackdrop) {
    installBackdrop.addEventListener("click", closeInstallHelp);
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && installModal && !installModal.hidden) closeInstallHelp();
  });

  if ("serviceWorker" in navigator && ["http:", "https:"].includes(window.location.protocol)) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("./service-worker.js").catch(() => {
        // The converter still works if service worker registration is unavailable.
      });
    });
  }
})();
