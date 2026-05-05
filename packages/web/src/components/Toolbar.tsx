import { LANGS, type UiCopy, type UiLang } from '../i18n';
import { THEMES, type ThemeName } from '../theme';

interface Props {
  theme: ThemeName;
  onTheme: (t: ThemeName) => void;
  lang: UiLang;
  onLang: (lang: UiLang) => void;
  copy: UiCopy['toolbar'];
}

export function Toolbar({ theme, onTheme, lang, onLang, copy }: Props) {
  return (
    <div className="rs-toolbar">
      <div className="rs-toolbar-group">
        <label className="rs-toolbar-label">{copy.theme}</label>
        <div className="rs-toolbar-buttons">
          {THEMES.map((t) => (
            <button
              key={t}
              type="button"
              className={t === theme ? 'rs-toolbar-btn rs-active' : 'rs-toolbar-btn'}
              onClick={() => onTheme(t)}
            >
              {copy.themeLabels[t]}
            </button>
          ))}
        </div>
      </div>
      <div className="rs-toolbar-group">
        <label className="rs-toolbar-label">{copy.language}</label>
        <select className="rs-toolbar-select" value={lang} onChange={(event) => onLang(event.currentTarget.value as UiLang)}>
          {LANGS.map((option) => (
            <option key={option} value={option}>
              {copy.languageLabels[option]}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
