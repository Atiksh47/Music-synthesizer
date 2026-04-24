import json
import urllib.request
import urllib.error

from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS

from analyzer import analyze
from mapper import map_to_music

app = Flask(__name__)
CORS(app)

MAX_LINES   = 500
OLLAMA_URL  = "http://localhost:11434/api/chat"
OLLAMA_MODEL = "qwen3.5:0.8b"


@app.route("/analyze", methods=["POST"])
def analyze_code():
    data = request.get_json(silent=True)
    if not data or "code" not in data:
        return jsonify({"error": "Missing 'code' field"}), 400

    source = data["code"]
    if len(source.splitlines()) > MAX_LINES:
        return jsonify({"error": f"Input exceeds {MAX_LINES} line limit"}), 400

    try:
        metrics, _, tree = analyze(source)
    except SyntaxError as e:
        return jsonify({"error": f"Syntax error: {e}"}), 422
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    return jsonify(map_to_music(metrics, tree))


@app.route("/explain", methods=["POST"])
def explain_code():
    body   = request.get_json(silent=True) or {}
    code   = body.get("code", "")
    bpm    = body.get("bpm", 120)
    meta   = body.get("metadata", {})
    voices = body.get("voices", [])

    prompt = _build_prompt(code, bpm, meta, voices)

    def stream():
        payload = json.dumps({
            "model":    OLLAMA_MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "stream":   True,
        }).encode()

        req = urllib.request.Request(
            OLLAMA_URL,
            data=payload,
            headers={"Content-Type": "application/json"},
        )

        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                for raw in resp:
                    if not raw.strip():
                        continue
                    try:
                        chunk = json.loads(raw)
                    except json.JSONDecodeError:
                        continue
                    text = chunk.get("message", {}).get("content", "")
                    if text:
                        yield f"data: {json.dumps({'text': text})}\n\n"
                    if chunk.get("done"):
                        break
        except urllib.error.URLError as exc:
            yield f"data: {json.dumps({'error': f'Ollama unreachable: {exc.reason}'})}\n\n"
        except Exception as exc:
            yield f"data: {json.dumps({'error': str(exc)})}\n\n"

        yield "data: [DONE]\n\n"

    return Response(
        stream_with_context(stream()),
        mimetype="text/event-stream",
        headers={
            "Cache-Control":    "no-cache",
            "X-Accel-Buffering": "no",
            "Connection":       "keep-alive",
        },
    )


def _build_prompt(code: str, bpm: int, meta: dict, voices: list) -> str:
    complexity   = meta.get("complexity", 1)
    depth        = meta.get("depth", 1)
    fn_count     = meta.get("function_count", 1)
    comment_ratio = meta.get("comment_ratio", 0)
    loc          = meta.get("loc", 0)
    waveforms    = ", ".join({v.get("waveform", "sine") for v in voices}) if voices else "sine"
    total_notes  = sum(len(v.get("notes", [])) for v in voices)

    return f"""You explain code sonification systems. Given Python code and its musical analysis, write exactly 2-3 sentences explaining what makes this code's music distinctive. Name specific code constructs and their sonic effects. Be concrete, not generic.

Sonification rules:
- Cyclomatic complexity → BPM (higher complexity = faster tempo)
- Max nesting depth → base pitch register (deeper = higher pitch)
- Each function → independent voice (waveform + gain)
- Loops → phrase captured once, replayed N times with 0.82× amplitude decay per iteration
- Recursive calls → 3-semitone harmonic overlay
- if/else branches → if-branch at full volume, else-branch at 0.5×
- return statements → pitch descends one step (phrase resolution)
- All pitches quantized to A minor pentatonic

Code ({loc} lines):
{code[:700]}

Musical output: {bpm} BPM · {fn_count} voice(s) · waveforms: {waveforms} · complexity={complexity} · max depth={depth} · {total_notes} total notes · comment ratio={comment_ratio:.0%}

Explain this specific code's musical character:"""


if __name__ == "__main__":
    app.run(debug=True)
