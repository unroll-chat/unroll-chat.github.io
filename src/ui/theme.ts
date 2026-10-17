// ── Theme Management ─────────────────────────────────────────

const STORAGE_KEY = 'unroll-chat-theme';

export type Theme = 'dark' | 'light';

function applyTheme(theme: Theme): void {
  document.documentElement.style.backgroundColor =
    theme === 'dark' ? '#0a0a0b' : '#fafafa';
}

export function getTheme(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return 'dark';
}

export function setTheme(theme: Theme): void {
  localStorage.setItem(STORAGE_KEY, theme);
  applyTheme(theme);
}

export function toggleTheme(): Theme {
  const next: Theme = getTheme() === 'dark' ? 'light' : 'dark';
  setTheme(next);
  return next;
}

/** Call once on startup to apply the persisted (or default) theme. */
export function initTheme(): void {
  applyTheme(getTheme());
}
