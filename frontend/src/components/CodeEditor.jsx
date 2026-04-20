const PLACEHOLDER = `# Paste any Python code here, then click Analyze
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)`;

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

  const lines = code.split('\n').length;
  const overLimit = lines > 500;

  return (
    <div className="editor-wrap">
      <textarea
        className="code-input"
        value={code}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKey}
        placeholder={PLACEHOLDER}
        spellCheck={false}
        autoComplete="off"
        autoCorrect="off"
      />
      <div className="editor-footer">
        <span className={`line-count ${overLimit ? 'over' : ''}`}>
          {lines} / 500 lines
        </span>
        <button
          className="analyze-btn"
          onClick={onSubmit}
          disabled={loading || !code.trim() || overLimit}
        >
          {loading ? 'Analyzing…' : 'Analyze & Play'}
        </button>
      </div>
    </div>
  );
}
