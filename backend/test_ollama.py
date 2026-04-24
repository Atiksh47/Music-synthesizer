"""Quick smoke-test for the Ollama /api/chat endpoint used by the explain route."""
import json
import urllib.request
import urllib.error
import sys

OLLAMA_URL   = "http://localhost:11434/api/chat"
OLLAMA_MODEL = "qwen3.5:0.8b"


def test_non_streaming():
    """Single-shot (non-streaming) call — fastest way to confirm the model loads."""
    print(f"[1] Non-streaming test  model={OLLAMA_MODEL} ...")
    payload = json.dumps({
        "model":    OLLAMA_MODEL,
        "messages": [{"role": "user", "content": "Say HELLO in exactly one word."}],
        "stream":   False,
    }).encode()

    req = urllib.request.Request(
        OLLAMA_URL,
        data=payload,
        headers={"Content-Type": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        data = json.loads(resp.read())
    reply = data.get("message", {}).get("content", "").strip()
    print(f"    → reply: {reply!r}")
    assert reply, "Empty reply from model"
    print("    ✓ PASS\n")


def test_streaming():
    """NDJSON streaming call — mirrors exactly what app.py does."""
    print(f"[2] Streaming test  model={OLLAMA_MODEL} ...")
    payload = json.dumps({
        "model":    OLLAMA_MODEL,
        "messages": [{"role": "user", "content": "Count from 1 to 5, one number per line."}],
        "stream":   True,
    }).encode()

    req = urllib.request.Request(
        OLLAMA_URL,
        data=payload,
        headers={"Content-Type": "application/json"},
    )

    chunks_received = 0
    full_text = ""
    with urllib.request.urlopen(req, timeout=60) as resp:
        for raw in resp:
            raw = raw.strip()
            if not raw:
                continue
            chunk = json.loads(raw)
            text = chunk.get("message", {}).get("content", "")
            if text:
                chunks_received += 1
                full_text += text
                print(f"    chunk {chunks_received}: {text!r}")
            if chunk.get("done"):
                break

    print(f"    → total chunks: {chunks_received}")
    print(f"    → full text: {full_text.strip()!r}")
    assert chunks_received > 0, "No streaming chunks received"
    print("    ✓ PASS\n")


if __name__ == "__main__":
    try:
        test_non_streaming()
        test_streaming()
        print("All tests passed — Ollama is working correctly.")
    except urllib.error.URLError as e:
        print(f"\n✗ Cannot reach Ollama: {e.reason}")
        print("  Make sure Ollama is running  (`ollama serve`  or the desktop app).")
        sys.exit(1)
    except AssertionError as e:
        print(f"\n✗ Assertion failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
        sys.exit(1)
