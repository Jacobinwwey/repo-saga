import { FormEvent, useState } from 'react';

interface Props {
  onSubmit: (source: string) => void;
  disabled?: boolean;
}

const EXAMPLES = [
  'https://github.com/vitejs/vite',
  'https://github.com/sindresorhus/execa',
  './my-project',
];

export function SagaForm({ onSubmit, disabled }: Props) {
  const [value, setValue] = useState('');

  function handle(e: FormEvent) {
    e.preventDefault();
    const v = value.trim();
    if (!v) return;
    onSubmit(v);
  }

  return (
    <form onSubmit={handle} className="rs-form">
      <label className="rs-form-label" htmlFor="rs-source">
        Repository URL or local path
      </label>
      <div className="rs-form-row">
        <input
          id="rs-source"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="https://github.com/user/repo  or  /Users/me/projects/foo"
          spellCheck={false}
          autoComplete="off"
          disabled={disabled}
        />
        <button type="submit" disabled={disabled || !value.trim()}>
          {disabled ? 'Working…' : 'Generate'}
        </button>
      </div>
      <div className="rs-form-hint">
        Try one of:
        {EXAMPLES.map((ex) => (
          <button
            type="button"
            key={ex}
            className="rs-form-chip"
            onClick={() => setValue(ex)}
            disabled={disabled}
          >
            {ex}
          </button>
        ))}
      </div>
    </form>
  );
}
