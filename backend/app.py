from flask import Flask, request, jsonify
from flask_cors import CORS

from analyzer import analyze
from mapper import map_to_music

app = Flask(__name__)
CORS(app)

MAX_LINES = 500


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


if __name__ == "__main__":
    app.run(debug=True)
