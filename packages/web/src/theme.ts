export type ThemeName = 'epic' | 'dark-fantasy' | 'academic' | 'minimal';

export const THEMES: ThemeName[] = ['epic', 'dark-fantasy', 'academic', 'minimal'];

export const THEME_LABELS: Record<ThemeName, string> = {
  epic: 'Epic',
  'dark-fantasy': 'Dark Fantasy',
  academic: 'Academic',
  minimal: 'Minimal',
};

export function applyTheme(theme: ThemeName): void {
  if (typeof document === 'undefined') return;
  document.documentElement.dataset.theme = theme;
  document.body?.setAttribute('data-theme', theme);
}
