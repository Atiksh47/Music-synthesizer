# Code → Music Synthesizer

Turn your Python code into music. Paste any Python snippet and hear a short generative piece shaped by its structure — complexity, nesting, function count, and identifier names all influence the sound.

## How It Works

The backend parses your code into an AST and extracts structural metrics. Those metrics are mapped to musical parameters and sent to the frontend, where Web Audio API plays them back.

| Code Property | Sound Effect |
|---|---|
| Cyclomatic complexity | Tempo (BPM) |
| Nesting depth | Pitch |
| Function count | Number of voices |
| Lines of code | Piece duration |
| Identifier names | Timbre (waveform type) |
| Comment ratio | Volume |
| Avg variable name length | Reverb amount |

Two structurally different programs produce noticeably different sounds. A flat 10-line script and a deeply nested recursive function will sound nothing alike.

## Stack

- **Backend**: Python, Flask, `ast` module
- **Frontend**: React (Vite), Web Audio API

## Getting Started

### Backend

```bash
cd backend
pip install -r requirements.txt
python app.py
```

Runs on `http://localhost:5000`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Runs on `http://localhost:5173`.

## Project Structure

```
music-synthesizer/
├── backend/
│   ├── app.py           # Flask API
│   ├── analyzer.py      # AST traversal + metric extraction
│   ├── mapper.py        # Metrics → music parameters
│   └── tests/
├── frontend/
│   └── src/
│       ├── App.jsx
│       ├── components/
│       │   ├── CodeEditor.jsx
│       │   └── Visualizer.jsx
│       └── audio/
│           └── AudioEngine.js
├── PLAN.md
└── README.md
```

## Example

Paste this into the editor:

```python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n - 1) + fibonacci(n - 2)
```

Then submit and hit play. Change it to a deeply nested loop-heavy script and hear the tempo and pitch shift.

## Development Notes

- Input is capped at 500 lines to keep parse times fast
- All pitches are quantized to the A minor pentatonic scale so output stays musical
- Audio scheduling uses `AudioContext.currentTime` offsets for precise timing
