/**
 * Application Bootstrap & Keyboard Shortcuts
 */
document.addEventListener('DOMContentLoaded', () => {
  // Apply saved theme
  const savedTheme = localStorage.getItem('todo_theme') || 'system';
  document.documentElement.setAttribute('data-theme', savedTheme);

  // Initialize UI & PWA controllers
  UIController.init();
  PWAController.init();

  // Desktop Keyboard Shortcuts
  document.addEventListener('keydown', (e) => {
    // Prevent trigger when typing inside inputs
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
      if (e.key === 'Escape') UIController.closeModal();
      return;
    }

    if (e.key === 'n' || e.key === 'N') {
      e.preventDefault();
      UIController.openTaskModal();
    } else if (e.key === '/') {
      e.preventDefault();
      document.getElementById('global-search').focus();
    } else if (e.key === 'Escape') {
      UIController.closeModal();
    }
  });

  // Initial render
  UIController.switchView('dashboard');
});