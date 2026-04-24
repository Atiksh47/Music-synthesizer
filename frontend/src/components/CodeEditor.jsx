import { EXAMPLES } from '../data/examples';

export default function CodeEditor({ code, onChange, onSubmit, loading }) {
  const handleKey = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const { selectionStart: s, selectionEnd: end } = e.target;
      const next = code.slice(0, s) + '    ' + code.slice(end);
      onChange(next);
      requestAnimationFrame(() => {
        e.target.selectionStart = e.target.selectionEnd = s + 4;
      });
    }
  };

  const handleExample = (e) => {
    const idx = parseInt(e.target.value, 10);
    if (!isNaN(idx)) onChange(EXAMPLES[idx].code);
  };

  const lines = code.split('\n').length;
  const overLimit = lines > 500;

  return (
    <div className="editor-wrap">
      <div className="examples-bar">
        <span className="examples-label">Examples</span>
        <select className="examples-select" onChange={handleExample} value="">
          <option value="" disabled>Pick an example…</option>
          {EXAMPLES.map((ex, i) => (
            <option key={ex.label} value={i}>{ex.label}</option>
          ))}
        </select>
      </div>

      <textarea
        className="code-input"
        value={code}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKey}
        placeholder={'# Paste any Python code here\ndef fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n - 1) + fibonacci(n - 2)'}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
      />

      <div className="editor-footer">
        <span className={`line-count ${overLimit ? 'over' : ''}`}>
          {lines} / 500 lines
        </span>
        <button
          className={`analyze-btn ${loading ? 'loading' : ''}`}
          onClick={onSubmit}
          disabled={loading || !code.trim() || overLimit}
        >
          {loading ? 'Analyzing…' : '▶ Analyze & Play'}
        </button>
      </div>
    </div>
  );
}
