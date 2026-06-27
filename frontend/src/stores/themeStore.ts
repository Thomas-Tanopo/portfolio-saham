import { create } from 'zustand';

type ThemeMode = 'light' | 'dark';

interface ThemeStore {
  mode: ThemeMode;
  toggle: () => void;
  setMode: (mode: ThemeMode) => void;
}

export const useThemeStore = create<ThemeStore>((set) => ({
  mode: (localStorage.getItem('theme') as ThemeMode) || 'light',
  toggle: () =>
    set((state) => {
      const next = state.mode === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', next);
      return { mode: next };
    }),
  setMode: (mode) => {
    localStorage.setItem('theme', mode);
    set({ mode });
  },
}));
