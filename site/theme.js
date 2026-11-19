(() => {
  const key = 'photowall-theme';
  const system = matchMedia('(prefers-color-scheme: dark)');
  const root = document.documentElement;
  const themeColor = document.querySelector('meta[name="theme-color"]');
  let toggle;

  function savedTheme() {
    try {
      const value = localStorage.getItem(key);
      return value === 'light' || value === 'dark' ? value : null;
    } catch {
      return null;
    }
  }

  let preference = savedTheme();

  function applyTheme() {
    const theme = preference ?? (system.matches ? 'dark' : 'light');
    const dark = theme === 'dark';
    root.dataset.theme = theme;
    themeColor.content = dark ? '#0e192d' : '#f8f7f3';
    if (toggle) toggle.setAttribute('aria-pressed', String(dark));
  }

  applyTheme();
  system.addEventListener('change', applyTheme);
  window.addEventListener('storage', (event) => {
    if (event.key !== key && event.key !== null) return;
    preference = savedTheme();
    applyTheme();
  });
  document.addEventListener('DOMContentLoaded', () => {
    toggle = document.querySelector('.theme-toggle');
    applyTheme();
    toggle.hidden = false;
    toggle.addEventListener('click', () => {
      preference = root.dataset.theme === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem(key, preference);
      } catch {
        // Theme switching still works on this page when storage is blocked.
      }
      applyTheme();
    });
  });
})();
