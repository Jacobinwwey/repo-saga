import { THEME_LABELS, ThemeName } from '../theme';

interface Props {
  theme: ThemeName;
  onTheme: (t: ThemeName) => void;
}

export function Toolbar({ theme, onTheme }: Props) {
  const themes = Object.keys(THEME_LABELS) as ThemeName[];
  return (
    <div className="rs-toolbar">
      <label className="rs-toolbar-label">Theme</label>
      <div className="rs-toolbar-buttons">
        {themes.map((t) => (
          <button
            key={t}
            type="button"
            className={t === theme ? 'rs-toolbar-btn rs-active' : 'rs-toolbar-btn'}
            onClick={() => onTheme(t)}
          >
            {THEME_LABELS[t]}
          </button>
        ))}
      </div>
    </div>
  );
}
