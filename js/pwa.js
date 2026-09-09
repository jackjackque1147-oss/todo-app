/**
 * Service Worker Registration & PWA Installation Logic
 */
const PWAController = (() => {
  let deferredPrompt = null;

  function init() {
    registerServiceWorker();
    setupInstallPrompt();
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('./service-worker.js')
          .then((reg) => console.log('ServiceWorker registered with scope:', reg.scope))
          .catch((err) => console.error('ServiceWorker registration failed:', err));
      });
    }
  }

  function setupInstallPrompt() {
    const installBtn = document.getElementById('pwa-install-btn');

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      if (installBtn) {
        installBtn.classList.remove('hidden');
        installBtn.addEventListener('click', async () => {
          installBtn.classList.add('hidden');
          if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`User prompt outcome: ${outcome}`);
            deferredPrompt = null;
          }
        });
      }
    });

    window.addEventListener('appinstalled', () => {
      if (installBtn) installBtn.classList.add('hidden');
      deferredPrompt = null;
      console.log('PWA installed successfully');
    });
  }

  return { init };
})();