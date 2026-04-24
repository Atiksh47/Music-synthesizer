import { useState, useRef, useEffect } from 'react';
import CodeEditor from './components/CodeEditor';
import Visualizer from './components/Visualizer';
import { AudioEngine } from './audio/AudioEngine';
import { EXAMPLES } from './data/examples';
import './App.css';

const engine = new AudioEngine();

const STAT_LABELS = {
  complexity:     'Complexity',
  depth:          'Max Depth',
  function_count: 'Functions',
  loc:            'Lines',
  comment_ratio:  'Comments',
};

const MAPPING_RULES = [
  { icon: '⏱', label: 'Cyclomatic complexity', effect: 'Tempo (BPM)' },
  { icon: '🎵', label: 'Nesting depth',         effect: 'Pitch register' },
  { icon: '🔁', label: 'Loops',                  effect: 'Repeated phrases' },
  { icon: '↕',  label: 'Branches (if/else)',     effect: 'Harmonic volume split' },
  { icon: '🔀', label: 'Recursive calls',        effect: '3-semitone harmonic overlay' },
  { icon: '↩',  label: 'Return statements',      effect: 'Descending resolution' },
  { icon: '🎹', label: 'Each function',          effect: 'Independent voice' },
];

function MetadataBar({ data, bpm }) {
  return (
    <div className="metadata-bar">
      <div className="stat">
        <span className="stat-val">{bpm}</span>
        <span className="stat-label">BPM</span>
      </div>
      {Object.entries(STAT_LABELS).map(([key, label]) => (
        <div key={key} className="stat">
          <span className="stat-val">
            {key === 'comment_ratio'
              ? `${Math.round(data[key] * 100)}%`
              : data[key]}
          </span>
          <span className="stat-label">{label}</span>
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-icon">♩</div>
      <p className="empty-headline">Your code becomes music</p>
      <p className="empty-sub">
        Paste Python code in the editor, pick an example, then hit Analyze & Play.
      </p>
      <ul className="mapping-list">
        {MAPPING_RULES.map((r) => (
          <li key={r.label}>
            <span className="map-icon">{r.icon}</span>
            <span className="map-code">{r.label}</span>
            <span className="map-arrow">→</span>
            <span className="map-effect">{r.effect}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function App() {
  const [code, setCode]       = useState('');
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError]     = useState(null);
  const [result, setResult]   = useState(null);
  const [dark, setDark]       = useState(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  const analyserRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('theme', dark ? 'dark' : 'light');
  }, [dark]);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    engine.stop();
    setPlaying(false);

    try {
      const res = await fetch('/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed');

      setResult(data);
      analyserRef.current = engine.play(data, () => setPlaying(false));
      setPlaying(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStop = () => {
    engine.stop();
    setPlaying(false);
  };

  return (
    <div className={`app ${dark ? 'dark' : 'light'}`}>
      <header className="app-header">
        <div className="header-left">
          <h1>Code → Music</h1>
          <p className="subtitle">
            Complexity drives tempo · Nesting drives pitch · Structure becomes sound
          </p>
        </div>
        <button
          className="theme-toggle"
          onClick={() => setDark((d) => !d)}
          aria-label="Toggle theme"
          title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {dark ? '☀' : '☾'}
        </button>
      </header>

      <main className="app-main">
        <div className="pane-left">
          <CodeEditor
            code={code}
            onChange={setCode}
            onSubmit={handleSubmit}
            loading={loading}
          />
          {error && (
            <div className="error-banner" role="alert">
              <span className="error-icon">⚠</span>
              {error}
            </div>
          )}
        </div>

        <div className="pane-right">
          {!result ? (
            <EmptyState />
          ) : (
            <>
              <MetadataBar data={result.metadata} bpm={result.bpm} />

              {playing ? (
                <div className="playback-section">
                  <p className="now-playing">
                    <span className="pulse-dot" /> Now playing…
                  </p>
                  <Visualizer analyser={analyserRef.current} />
                  <button className="stop-btn" onClick={handleStop}>
                    ■ Stop
                  </button>
                </div>
              ) : (
                <div className="playback-section">
                  <p className="replay-hint">
                    Edit the code or pick a new example and hit Analyze & Play again.
                  </p>
                  <button className="analyze-btn replay" onClick={handleSubmit} disabled={loading || !code.trim()}>
                    ▶ Replay
                  </button>
                </div>
              )}

              <div className="voice-legend">
                <p className="legend-title">Voices ({result.voices?.length ?? 0})</p>
                {result.voices?.map((v, i) => (
                  <div key={i} className="legend-item">
                    <span className="legend-dot" style={{ background: VOICE_COLORS[i % VOICE_COLORS.length] }} />
                    <span className="legend-wave">{v.waveform}</span>
                    <span className="legend-notes">{v.notes?.length ?? 0} notes</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

const VOICE_COLORS = [
  '#a78bfa', '#38bdf8', '#34d399', '#fb923c', '#f472b6', '#facc15', '#818cf8',
];
