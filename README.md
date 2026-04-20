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
- Flask API

**Frontend**
- React (Vite)
- Web Audio API
  - precise scheduling via `AudioContext.currentTime`
  - polyphonic synthesis with `OscillatorNode`
  - reverb via `ConvolverNode`
  - real-time visualization via `AnalyserNode`

## Getting Started

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

## Architecture

```
backend/
  analyzer.py    — Extracts structural metrics (complexity, depth, identifiers)
  traverser.py   — Converts AST traversal into time-ordered event sequences
  mapper.py      — Computes global parameters and orchestrates traversal
  app.py         — Flask API

frontend/src/
  audio/
    AudioEngine.js   — Schedules and plays event stream via Web Audio API
  components/
    CodeEditor.jsx
    Visualizer.jsx
  App.jsx
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
├── frontend/
├── PLAN.md
└── README.md
```
