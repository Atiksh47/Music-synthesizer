import { useState, useRef } from 'react';

export default function ExplainPanel({ code, result }) {
  const [state, setState]       = useState('idle'); // idle | loading | streaming | done | error
  const [text, setText]         = useState('');
  const [errMsg, setErrMsg]     = useState('');
  const readerRef               = useRef(null);

  const handleExplain = async () => {
    setText('');
    setErrMsg('');
    setState('loading');

    try {
      const res = await fetch('/explain', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          code,
          bpm:      result.bpm,
          metadata: result.metadata,
          voices:   result.voices,
        }),
      });

      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(error);
      }

      setState('streaming');
      const reader = res.body.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop(); // keep incomplete trailing line

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') { setState('done'); return; }

          try {
            const parsed = JSON.parse(payload);
            if (parsed.error) throw new Error(parsed.error);
            if (parsed.text)  setText(prev => prev + parsed.text);
          } catch (parseErr) {
            if (parseErr.message !== 'Unexpected end of JSON input') throw parseErr;
          }
        }
      }
      setState('done');
    } catch (e) {
      setErrMsg(e.message);
      setState('error');
    }
  };

  const handleReset = () => {
    readerRef.current?.cancel().catch(() => {});
    setState('idle');
    setText('');
    setErrMsg('');
  };

  const isWorking = state === 'loading' || state === 'streaming';

  return (
    <div className="explain-panel">
      <div className="explain-header">
        <span className="explain-title">
          <span className="explain-spark">✦</span> Why does it sound like this?
        </span>
        {(state === 'done' || state === 'error') && (
          <button className="explain-reset" onClick={handleReset} title="Ask again">
            ↺
          </button>
        )}
      </div>

      {state === 'idle' && (
        <button className="explain-trigger" onClick={handleExplain}>
          Ask AI to explain this composition
        </button>
      )}

      {state === 'loading' && (
        <div className="explain-skeleton">
          <span className="skeleton-dot" />
          <span className="skeleton-dot" />
          <span className="skeleton-dot" />
          <span className="explain-thinking">Thinking…</span>
        </div>
      )}

      {(state === 'streaming' || state === 'done') && text && (
        <p className="explain-text">
          {text}
          {state === 'streaming' && <span className="explain-cursor" />}
        </p>
      )}

      {state === 'error' && (
        <p className="explain-error">
          <span>⚠ </span>{errMsg || 'Could not reach Ollama. Is it running?'}
        </p>
      )}
    </div>
  );
}
