from typing import List
from analyzer import CodeMetrics, FunctionData

# A minor pentatonic across ~3 octaves
PENTATONIC = [
    220.00, 261.63, 293.66, 329.63, 392.00,   # A3 C4 D4 E4 G4
    440.00, 523.25, 587.33, 659.25, 783.99,   # A4 C5 D5 E5 G5
    880.00, 1046.50, 1174.66,                  # A5 C6 D6
]

WAVEFORMS = ["sine", "triangle", "square", "sawtooth"]


def _clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


def _lerp(t: float, lo: float, hi: float) -> float:
    return lo + _clamp(t, 0.0, 1.0) * (hi - lo)


def _pentatonic_freq(depth: int) -> float:
    return PENTATONIC[_clamp(depth - 1, 0, len(PENTATONIC) - 1)]


def _waveform(metrics: CodeMetrics, offset: int = 0) -> str:
    return WAVEFORMS[(metrics.identifier_hash + offset) % len(WAVEFORMS)]


def _script_voice(metrics: CodeMetrics, beat: float, gain: float) -> dict:
    freq = _pentatonic_freq(max(metrics.max_nesting_depth, 1))
    return {
        "waveform": _waveform(metrics),
        "gain": gain,
        "function_name": "__main__",
        "notes": [{"frequency_hz": round(freq, 2), "duration_s": round(beat * 2, 3), "delay_s": 0.0}],
    }


def _function_voice(
    func: FunctionData,
    index: int,
    metrics: CodeMetrics,
    beat: float,
    total_duration: float,
    gain: float,
) -> dict:
    stagger = index * beat * 0.5
    seq = func.depth_sequence if func.depth_sequence else [max(func.max_depth, 1)]

    notes = []
    t = stagger
    for depth in seq:
        if t >= total_duration:
            break
        note_dur = round(beat * (2.0 if depth <= 1 else 1.0), 3)
        notes.append({
            "frequency_hz": round(_pentatonic_freq(depth), 2),
            "duration_s": note_dur,
            "delay_s": round(t, 3),
        })
        t += note_dur

    if not notes:
        notes = [{
            "frequency_hz": round(_pentatonic_freq(1), 2),
            "duration_s": round(beat, 3),
            "delay_s": round(stagger, 3),
        }]

    return {
        "waveform": _waveform(metrics, index),
        "gain": round(gain * _clamp(1.0 - index * 0.1, 0.5, 1.0), 2),
        "function_name": func.name,
        "notes": notes,
    }


def map_to_music(metrics: CodeMetrics, functions: List[FunctionData]) -> dict:
    total_complexity = (
        sum(f.complexity for f in functions) if functions
        else metrics.cyclomatic_complexity
    )

    bpm = round(_lerp((total_complexity - 1) / 19.0, 60, 180))
    beat = 60.0 / bpm
    base_freq = _pentatonic_freq(max(metrics.max_nesting_depth, 1))
    total_duration = round(_lerp((metrics.loc - 1) / 499.0, 5, 30), 1)
    reverb = round(_lerp((metrics.avg_identifier_length - 1) / 19.0, 0.0, 0.7), 2)
    gain_base = round(_clamp(1.0 - metrics.comment_ratio * 1.5, 0.3, 1.0), 2)

    voice_funcs = functions[:6]
    if not voice_funcs:
        voices = [_script_voice(metrics, beat, gain_base)]
    else:
        voices = [
            _function_voice(f, i, metrics, beat, total_duration, gain_base)
            for i, f in enumerate(voice_funcs)
        ]

    return {
        "bpm": bpm,
        "base_pitch_hz": round(base_freq, 2),
        "reverb_amount": reverb,
        "total_duration_s": total_duration,
        "voices": voices,
        "metadata": {
            "complexity": total_complexity,
            "depth": metrics.max_nesting_depth,
            "function_count": metrics.function_count,
            "loc": metrics.loc,
            "comment_ratio": round(metrics.comment_ratio, 2),
        },
    }
