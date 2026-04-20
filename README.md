# Code → Music Synthesizer

A compiler that turns Python source code into generative music. Not by mapping statistics to sound — by walking the AST in execution order and scheduling musical events in real time. Your code's structure *is* the composition.

## What Makes This Different

Most "code sonification" projects compute aggregate metrics and play a chord. This one treats the AST as a score.

The system performs a depth-first traversal of your program and emits timed musical events as it encounters each construct — in the same order a Python interpreter would execute them. The result is a piece of music that literally narrates your code's logic.

## How the Compiler Works

### Functions → Voices
Each function definition spawns a new polyphonic voice with its own timbre (waveform), determined by a hash of the codebase's identifiers. Voices enter as their definitions are encountered, staggered like sections of an orchestra.

### Nesting Depth → Pitch
Pitch is not a static parameter — it changes dynamically as the traversal descends and ascends through scopes. Every `if`, `for`, `while`, and `with` increments the depth counter, driving the melody upward. Exiting a scope drops it back down. The result is a melodic line that mirrors the shape of your control flow.

### Loops → Repeating Phrases
Loop bodies are captured as musical phrases and replayed N times — where N is read directly from `range(n)` literals when available. Each repetition fades slightly (×0.82 gain), creating a natural rhythmic decay. **Nested loops double the tempo** at each level, so triply-nested loops produce tight 8× speed bursts inside the outer phrase.

### `if` / `else` → Branching Melody
The `if` condition emits an upward questioning note. The `if` body plays normally. The `else` body is replayed at 50% gain — present, but softer — representing the road not taken.

### Recursive Calls → Motif Repetition
When a function calls itself, the system detects it and overlays a harmony note three pentatonic steps above the current pitch at 85% gain. Recursive structure produces audible self-similarity.

### `return` → Resolve
Every `return` statement drops the pitch one pentatonic step — a musical resolution. Functions always end on a lower note than they started.

### Global Parameters
| Code Property | Musical Parameter |
|---|---|
| Cyclomatic complexity | Tempo (60–180 BPM) |
| Max nesting depth | Base pitch register |
| Avg identifier length | Reverb wetness |
| Comment ratio | Master gain |

All pitches are quantized to the **A minor pentatonic scale**, so output is always musical regardless of code structure.

## Example

```python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)
```

This produces a 6-note narrative:

```
0.00s  opening theme       — function entry, C4
1.82s  questioning note ↑  — if-test, depth increases to E4
2.04s  resolve             — return n, drops to C4
3.41s  deep resolve        — outer return, drops to A3
4.32s  recursive accent ↑  — fibonacci calls itself, G4 at 85% gain
4.77s  closing resolve     — function exits
```

Swap it for a triply-nested loop and the inner phrases play at 8× speed.

## Stack

- **Backend**: Python 3.10+, Flask, standard `ast` module (zero ML dependencies)
- **Frontend**: React, Web Audio API — precise note scheduling via `AudioContext.currentTime` offsets, reverb via programmatic `ConvolverNode` impulse response, real-time frequency visualizer

## Getting Started

**Backend**
```bash
cd backend
pip install -r requirements.txt
python app.py
# → http://localhost:5000
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

## Architecture

```
backend/
  analyzer.py    — AST walk: extracts cyclomatic complexity, nesting depth,
                   identifier stats, LOC, comment ratio
  traverser.py   — Temporal walker: DFS traversal → timed note sequences
                   per voice, with loop capture/replay and recursion detection
  mapper.py      — Computes global params (BPM, reverb) + runs TemporalWalker
  app.py         — Flask API, single POST /analyze endpoint

frontend/src/
  audio/
    AudioEngine.js   — Builds Web Audio graph: OscillatorNode per note,
                       ADSR envelopes, dry/wet reverb, AnalyserNode for viz
  components/
    CodeEditor.jsx   — Textarea with Tab-indent and 500-line guard
    Visualizer.jsx   — Canvas frequency bar animation via requestAnimationFrame
  App.jsx            — State, fetch, metadata display
```

## Project Structure

```
music-synthesizer/
├── backend/
│   ├── app.py
│   ├── analyzer.py
│   ├── mapper.py
│   ├── traverser.py
│   └── tests/
├── frontend/
│   └── src/
│       ├── App.jsx
│       ├── components/
│       └── audio/
├── PLAN.md
└── README.md
```
