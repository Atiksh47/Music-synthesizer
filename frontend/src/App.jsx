import { useState, useRef } from 'react';
import CodeEditor from './components/CodeEditor';
import Visualizer from './components/Visualizer';
import { AudioEngine } from './audio/AudioEngine';
import './App.css';

const engine = new AudioEngine();

const STAT_LABELS = {
  complexity: 'Complexity',
  depth: 'Max Depth',
  function_count: 'Functions',
  loc: 'Lines',
  comment_ratio: 'Comments',
};

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

export default function App() {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);
  const analyserRef = useRef(null);

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
    <div className="app">
      <header className="app-header">
        <h1>Code → Music</h1>
        <p className="subtitle">
          Complexity drives tempo · Nesting drives pitch · Structure becomes sound
        </p>
      </header>

      <main>
        <CodeEditor
          code={code}
          onChange={setCode}
          onSubmit={handleSubmit}
          loading={loading}
        />

        {error && <div className="error-banner">{error}</div>}

        {result && <MetadataBar data={result.metadata} bpm={result.bpm} />}

        {playing && (
          <div className="playback-section">
            <Visualizer analyser={analyserRef.current} />
            <button className="stop-btn" onClick={handleStop}>
              ■ Stop
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
