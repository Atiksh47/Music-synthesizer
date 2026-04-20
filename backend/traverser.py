import ast
from typing import List, Dict, Tuple
from analyzer import CodeMetrics

PENTATONIC = [
    220.00, 261.63, 293.66, 329.63, 392.00,
    440.00, 523.25, 587.33, 659.25, 783.99,
    880.00, 1046.50, 1174.66,
]
WAVEFORMS = ["sine", "triangle", "square", "sawtooth"]
MAX_VOICES = 6
MAX_LOOP_REPEAT = 4
MAX_DURATION_S = 30.0


class _Voice:
    def __init__(self, name: str, waveform: str, gain: float, start_offset: float = 0.0):
        self.name = name
        self.waveform = waveform
        self.gain = gain
        self.start_offset = start_offset
        self.notes: List[Dict] = []
        self.time: float = 0.0

    def emit(self, freq: float, duration_s: float, note_gain: float = 1.0):
        self.notes.append({
            "frequency_hz": round(freq, 2),
            "duration_s": round(duration_s, 3),
            "delay_s": round(self.time, 3),
            "gain": round(note_gain, 2),
        })
        self.time += duration_s

    def emit_at(self, freq: float, duration_s: float, at: float, note_gain: float = 1.0):
        """Emit without advancing time — used for overlaid accent notes."""
        self.notes.append({
            "frequency_hz": round(freq, 2),
            "duration_s": round(duration_s, 3),
            "delay_s": round(max(at, 0.0), 3),
            "gain": round(note_gain, 2),
        })

    def capture(self, fn) -> List[Dict]:
        """Run fn, capture its emitted notes, rewind time. Returns captured notes."""
        saved_len = len(self.notes)
        saved_time = self.time
        fn()
        captured = list(self.notes[saved_len:])
        del self.notes[saved_len:]
        self.time = saved_time
        return captured

    def replay(self, notes: List[Dict], gain_scale: float = 1.0):
        """Append notes starting at current time, preserving internal spacing."""
        if not notes:
            return
        origin = notes[0]["delay_s"]
        for n in notes:
            self.notes.append({
                **n,
                "delay_s": round(self.time + (n["delay_s"] - origin), 3),
                "gain": round(n["gain"] * gain_scale, 2),
            })
        phrase_dur = max(n["delay_s"] + n["duration_s"] for n in notes) - origin
        self.time += phrase_dur


class TemporalWalker:
    """
    Walks the AST in execution order and maps each structural element to a
    musical event. Each function gets its own voice. Loops repeat their body
    phrase. If/else branches: else plays softened. Recursive calls shift pitch up.
    """

    def __init__(self, metrics: CodeMetrics, bpm: int):
        self.beat = 60.0 / bpm
        self.metrics = metrics
        self._module_time = 0.0
        self._depth = 0
        self._function_stack: List[str] = []
        self._module_voice = _Voice(
            "__module__",
            WAVEFORMS[metrics.identifier_hash % len(WAVEFORMS)],
            gain=0.65,
        )
        self._voices: List[_Voice] = [self._module_voice]

    def walk(self, tree: ast.AST) -> Tuple[List[Dict], float]:
        for node in ast.iter_child_nodes(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                if len(self._voices) < MAX_VOICES:
                    self._handle_function(node)
            elif isinstance(node, ast.stmt):
                self._module_voice.time = self._module_time
                self._handle_stmt(node, self._module_voice)
                self._module_time = self._module_voice.time
        return self._build()

    # ------------------------------------------------------------------ #
    # Statement handlers                                                   #
    # ------------------------------------------------------------------ #

    def _handle_function(self, node):
        saved_depth = self._depth
        voice_idx = len(self._voices)
        waveform = WAVEFORMS[(self.metrics.identifier_hash + voice_idx) % len(WAVEFORMS)]
        gain = round(max(0.4, 0.85 - voice_idx * 0.1), 2)
        voice = _Voice(node.name, waveform, gain, start_offset=self._module_time)
        self._voices.append(voice)

        self._function_stack.append(node.name)
        self._depth = 1

        voice.emit(self._pitch(), self.beat * 2.0)          # opening theme
        for stmt in node.body:
            self._handle_stmt(stmt, voice)
        voice.emit(self._pitch(-1), self.beat * 1.5)        # closing resolve

        self._function_stack.pop()
        self._depth = saved_depth
        self._module_time += self.beat                       # advance module clock

    def _handle_stmt(self, node: ast.stmt, voice: _Voice):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            voice.emit(self._pitch(), self.beat * 0.5)
        elif isinstance(node, (ast.For, ast.AsyncFor)):
            self._handle_loop(node, voice, self._loop_count(node))
        elif isinstance(node, ast.While):
            self._handle_loop(node, voice, 2)
        elif isinstance(node, ast.If):
            self._handle_if(node, voice)
        elif isinstance(node, ast.Return):
            voice.emit(self._pitch(-1), self.beat * 1.5)
            if node.value is not None:
                self._accent_calls(node.value, voice)
        else:
            voice.emit(self._pitch(), self.beat * 0.5)
            self._accent_calls(node, voice)

    def _handle_loop(self, node: ast.AST, voice: _Voice, repeat: int):
        self._depth += 1
        saved_beat = self.beat
        self.beat = max(self.beat * 0.5, 0.05)  # each nesting level doubles tempo, min 50ms

        body = getattr(node, "body", [])
        captured = voice.capture(lambda: [self._handle_stmt(s, voice) for s in body])

        self.beat = saved_beat
        self._depth -= 1

        if not captured:
            voice.emit(self._pitch(), self.beat)
            return

        voice.replay(captured)                              # first iteration
        for i in range(1, repeat):
            voice.replay(captured, gain_scale=0.82 ** i)   # each rep fades

    def _handle_if(self, node: ast.If, voice: _Voice):
        self._depth += 1
        voice.emit(self._pitch(1), self.beat * 0.25)        # questioning note up

        for stmt in node.body:
            self._handle_stmt(stmt, voice)

        if node.orelse:
            captured_else = voice.capture(
                lambda: [self._handle_stmt(s, voice) for s in node.orelse]
            )
            voice.replay(captured_else, gain_scale=0.5)     # else: road not taken

        self._depth -= 1

    # ------------------------------------------------------------------ #
    # Helpers                                                              #
    # ------------------------------------------------------------------ #

    def _accent_calls(self, node: ast.AST, voice: _Voice):
        """Overlay a harmony note for the first function call found in a statement."""
        for child in ast.walk(node):
            if isinstance(child, ast.Call):
                t = voice.time - self.beat * 0.5
                if (
                    self._function_stack
                    and isinstance(child.func, ast.Name)
                    and child.func.id == self._function_stack[-1]
                ):
                    # Recursive call: pitch up 3 steps
                    voice.emit_at(self._pitch(3), self.beat * 0.5, at=t, note_gain=0.85)
                else:
                    voice.emit_at(self._pitch(1), self.beat * 0.25, at=t + 0.05, note_gain=0.6)
                break

    def _pitch(self, offset: int = 0) -> float:
        idx = max(0, min(self._depth + offset, len(PENTATONIC) - 1))
        return PENTATONIC[idx]

    def _loop_count(self, node: ast.AST) -> int:
        if isinstance(node, ast.For) and isinstance(node.iter, ast.Call):
            func = node.iter.func
            args = node.iter.args
            if isinstance(func, ast.Name) and func.id == "range" and args:
                try:
                    if len(args) == 1 and isinstance(args[0], ast.Constant):
                        return min(max(int(args[0].value), 1), MAX_LOOP_REPEAT)
                    if len(args) == 2 and all(isinstance(a, ast.Constant) for a in args):
                        count = int(args[1].value) - int(args[0].value)
                        return min(max(count, 1), MAX_LOOP_REPEAT)
                except (TypeError, ValueError):
                    pass
        return 2

    def _build(self) -> Tuple[List[Dict], float]:
        voices_out = []
        max_end = 0.0

        for voice in self._voices:
            if not voice.notes:
                continue
            notes = [
                {**n, "delay_s": round(n["delay_s"] + voice.start_offset, 3)}
                for n in voice.notes
            ]
            end = max(n["delay_s"] + n["duration_s"] for n in notes)
            max_end = max(max_end, end)
            voices_out.append({
                "waveform": voice.waveform,
                "gain": voice.gain,
                "function_name": voice.name,
                "notes": notes,
            })

        return voices_out, round(min(max(max_end, 2.0), MAX_DURATION_S), 1)
