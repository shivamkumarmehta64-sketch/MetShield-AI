'use client';

import { useSyncExternalStore } from 'react';
import { Moon, Sun } from 'lucide-react';

type ThemeMode = 'light' | 'dark';

const THEME_STORAGE_KEY = 'metshield-theme';
const THEME_EVENT = 'metshield-theme-change';

function subscribe(callback: () => void): () => void {
  window.addEventListener(THEME_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(THEME_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

function getSnapshot(): ThemeMode {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

function getServerSnapshot(): ThemeMode {
  return 'light';
}

export function toggleDocumentTheme(): ThemeMode {
  const current = getSnapshot();
  const next: ThemeMode = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, next);
  } catch {
    // Ignore storage quota / private mode restrictions
  }
  window.dispatchEvent(new Event(THEME_EVENT));
  return next;
}

export function useDocumentTheme(): ThemeMode {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export default function ThemeToggle({ className = '' }: { className?: string }) {
  const theme = useDocumentTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleDocumentTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`inline-flex items-center justify-center w-10 h-10 sm:w-8 sm:h-8 rounded-lg border border-hairline bg-card text-ink-muted hover:text-ink hover:bg-surface-alt transition-colors duration-150 ${className}`}
    >
      {isDark ? (
        <Sun className="w-4 h-4" strokeWidth={1.5} />
      ) : (
        <Moon className="w-4 h-4" strokeWidth={1.5} />
      )}
    </button>
  );
}
