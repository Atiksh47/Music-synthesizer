# Code → Music Synthesizer

A compiler-style system that converts Python programs into structured musical compositions. Instead of mapping aggregate statistics to sound, it traverses the AST in execution order and generates a timed sequence of musical events. Program structure directly determines melody, rhythm, and harmony.

## Overview

Most code sonification systems reduce programs to a set of metrics and map them to audio parameters. This project instead treats the program as a temporal process.

- Performs a depth-first traversal of the AST
- Emits timestamped musical events during traversal
- Schedules playback in real time using the Web Audio API

The result is a deterministic composition where control flow and structure are reflected in the audio sequence.

## System Design

### Execution Model

The backend converts source code into a time-ordered event stream:

```
AST → traversal → event sequence → audio engine
```

Each event encodes:

- timestamp
- pitch
- duration
- amplitude
- voice (instrument)

This separation allows deterministic playback and clean decoupling between analysis and audio rendering.

### Mapping Strategy

#### Functions → Voices

Each function definition creates a distinct voice with its own waveform. Voices are introduced as encountered during traversal, enabling polyphonic playback.

#### Nesting Depth → Pitch (Dynamic)

Pitch evolves during traversal:

- entering control structures increases pitch
- exiting decreases pitch

This produces a melodic contour aligned with program structure.

#### Loops → Repeated Phrases

Loop bodies are captured as phrases and replayed:

- iteration count inferred from `range(n)` when statically available
- repetitions decay in amplitude (×0.82)
- nested loops increase playback rate multiplicatively

#### Branching (`if` / `else`)

- condition emits a distinct transition note
- `if` branch plays normally
- `else` branch is rendered at reduced amplitude

#### Recursion → Motif Overlay

Recursive calls are detected and represented by overlaying harmonic intervals, producing audible self-similarity.

#### Returns → Resolution

Return statements lower pitch, providing consistent phrase resolution.

### Global Parameters

| Code Property | Musical Parameter |
|---|---|
| Cyclomatic complexity | Tempo (60–180 BPM) |
| Max nesting depth | Base pitch register |
| Avg identifier length | Reverb intensity |
| Comment ratio | Master gain |

All notes are quantized to the A minor pentatonic scale to maintain musical coherence.

## Features

- **Real-time Sonification**: Convert Python code to music with deterministic playback
- **Piano Roll Visualization**: See the musical structure before and during playback
- **AI-Powered Explanations**: Get concise explanations of how code structure maps to musical elements
- **Interactive Examples**: Explore curated Python examples showcasing different musical patterns
- **Dark/Light Mode**: Toggle themes for comfortable coding
- **Web Audio API**: High-precision scheduling for polyphonic synthesis

## Example

```python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)
```

Produces a short sequence where:

- branching introduces pitch variation
- recursion generates harmonic overlays
- returns resolve the phrase downward

## Stack

**Backend**
- Python 3.10+
- `ast` module for parsing and traversal
- Flask API with CORS
- Ollama integration for AI explanations

**Frontend**
- React 19 (Vite)
- Web Audio API
  - precise scheduling via `AudioContext.currentTime`
  - polyphonic synthesis with `OscillatorNode`
  - reverb via `ConvolverNode`
  - real-time visualization via `AnalyserNode`
- Canvas 2D for piano roll rendering

## Getting Started

**Prerequisites**
- Python 3.10+
- Node.js 18+
- Ollama (for AI explanations)

**Backend**
```bash
cd backend
pip install -r requirements.txt
python app.py
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

**AI Explanations** (Optional)
- Install [Ollama](https://ollama.ai/)
- Pull a model: `ollama pull qwen2.5:0.5b`
- Update `OLLAMA_MODEL` in `backend/app.py` if needed

## Architecture

```
backend/
  analyzer.py    — Extracts structural metrics (complexity, depth, identifiers)
  traverser.py   — Converts AST traversal into time-ordered event sequences
  mapper.py      — Computes global parameters and orchestrates traversal
  app.py         — Flask API with /analyze and /explain endpoints
  test_ollama.py — Ollama integration test

frontend/src/
  audio/
    AudioEngine.js   — Schedules and plays event stream via Web Audio API
  components/
    CodeEditor.jsx   — Code input with syntax highlighting and examples dropdown
    PianoRoll.jsx    — Canvas-based piano roll visualization
    Visualizer.jsx   — Real-time frequency spectrum display
    ExplainPanel.jsx — AI-generated explanations of musical mappings
  data/
    constants.js     — Voice colors and UI constants
    examples.js      — Curated Python code examples
  App.jsx            — Main application component
```

## Key Characteristics

- **Deterministic**: same code produces identical output
- **Structure-preserving**: control flow directly maps to temporal audio patterns
- **Real-time**: event scheduling performed with sub-millisecond precision
- **Extensible**: event-based design allows future export (e.g., MIDI) or alternative renderers

## Project Structure

```
music-synthesizer/
├── backend/
│   ├── analyzer.py
│   ├── app.py
│   ├── mapper.py
│   ├── requirements.txt
│   ├── test_ollama.py
│   └── traverser.py
├── frontend/
│   ├── eslint.config.js
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── public/
│   └── src/
│       ├── App.css
│       ├── App.jsx
│       ├── index.css
│       ├── main.jsx
│       ├── assets/
│       ├── audio/
│       │   └── AudioEngine.js
│       ├── components/
│       │   ├── CodeEditor.jsx
│       │   ├── ExplainPanel.jsx
│       │   ├── PianoRoll.jsx
│       │   └── Visualizer.jsx
│       └── data/
│           ├── constants.js
│           └── examples.js
├── plan.md
└── README.md
```
