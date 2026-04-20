import ast
from analyzer import CodeMetrics
from traverser import TemporalWalker

PENTATONIC = [
    220.00, 261.63, 293.66, 329.63, 392.00,
    440.00, 523.25, 587.33, 659.25, 783.99,
    880.00, 1046.50, 1174.66,
]


def _clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


def _lerp(t: float, lo: float, hi: float) -> float:
    return lo + _clamp(t, 0.0, 1.0) * (hi - lo)


def map_to_music(metrics: CodeMetrics, tree: ast.AST) -> dict:
    bpm = round(_lerp((metrics.cyclomatic_complexity - 1) / 19.0, 60, 180))
    reverb = round(_lerp((metrics.avg_identifier_length - 1) / 19.0, 0.0, 0.7), 2)

    depth_idx = _clamp(metrics.max_nesting_depth - 1, 0, len(PENTATONIC) - 1)
    base_freq = PENTATONIC[int(depth_idx)] if metrics.max_nesting_depth > 0 else PENTATONIC[0]

    voices, total_duration = TemporalWalker(metrics, bpm).walk(tree)

    return {
        "bpm": bpm,
        "base_pitch_hz": round(base_freq, 2),
        "reverb_amount": reverb,
        "total_duration_s": total_duration,
        "voices": voices,
        "metadata": {
            "complexity": metrics.cyclomatic_complexity,
            "depth": metrics.max_nesting_depth,
            "function_count": metrics.function_count,
            "loc": metrics.loc,
            "comment_ratio": round(metrics.comment_ratio, 2),
        },
    }
