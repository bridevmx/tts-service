import os
import sys
import subprocess
import tempfile
import urllib.request
from flask import Flask, request, Response, jsonify

app = Flask(__name__)

CACHE_DIR = os.getenv("PIPER_CACHE_DIR", "/data")
VOICES_DIR = os.path.join(CACHE_DIR, "voices")
os.makedirs(VOICES_DIR, exist_ok=True)

# Voice model download URLs mapping (HuggingFace Piper releases)
VOICE_MAP = {
    "es_MX-ald-medium": {
        "onnx": "https://huggingface.co/rhasspy/piper-voices/resolve/main/es/es_MX/ald/medium/es_MX-ald-medium.onnx",
        "json": "https://huggingface.co/rhasspy/piper-voices/resolve/main/es/es_MX/ald/medium/es_MX-ald-medium.onnx.json"
    },
    "es_MX-claude-high": {
        "onnx": "https://huggingface.co/rhasspy/piper-voices/resolve/main/es/es_MX/claude/high/es_MX-claude-high.onnx",
        "json": "https://huggingface.co/rhasspy/piper-voices/resolve/main/es/es_MX/claude/high/es_MX-claude-high.onnx.json"
    },
    "es_ES-davefx-medium": {
        "onnx": "https://huggingface.co/rhasspy/piper-voices/resolve/main/es/es_ES/davefx/medium/es_ES-davefx-medium.onnx",
        "json": "https://huggingface.co/rhasspy/piper-voices/resolve/main/es/es_ES/davefx/medium/es_ES-davefx-medium.onnx.json"
    }
}

def ensure_voice_downloaded(voice_id):
    if voice_id not in VOICE_MAP:
        voice_id = "es_MX-ald-medium"

    onnx_path = os.path.join(VOICES_DIR, f"{voice_id}.onnx")
    json_path = os.path.join(VOICES_DIR, f"{voice_id}.onnx.json")

    if not os.path.exists(onnx_path) or not os.path.exists(json_path):
        print(f"[Piper Engine] Downloading voice model {voice_id}...", flush=True)
        urls = VOICE_MAP[voice_id]
        urllib.request.urlretrieve(urls["onnx"], onnx_path)
        urllib.request.urlretrieve(urls["json"], json_path)
        print(f"[Piper Engine] Downloaded {voice_id} successfully.", flush=True)

    return onnx_path

@app.route("/v1/audio/speech", methods=["POST"])
def synthesize_speech():
    data = request.get_json(force=True, silent=True) or {}
    input_text = data.get("input", "").strip()
    voice_id = data.get("voice") or data.get("model") or "es_MX-ald-medium"
    speed = float(data.get("speed", 1.0))
    response_format = (data.get("response_format") or "mp3").lower()

    if not input_text:
        return jsonify({"error": "input text is required"}), 400

    try:
        onnx_path = ensure_voice_downloaded(voice_id)
    except Exception as e:
        print(f"[Piper Engine Error] Failed to download model: {e}", flush=True)
        return jsonify({"error": f"Failed to load model {voice_id}"}), 500

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_wav:
        wav_path = tmp_wav.name

    try:
        # Run piper executable / module
        length_scale = str(max(0.5, min(2.0, 1.0 / speed))) if speed > 0 else "1.0"
        cmd = [
            "piper",
            "--model", onnx_path,
            "--output_file", wav_path,
            "--length_scale", length_scale
        ]

        proc = subprocess.Popen(
            cmd,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        _, stderr = proc.communicate(input=input_text)

        if proc.returncode != 0:
            print(f"[Piper Engine Error]: {stderr}", flush=True)
            return jsonify({"error": "Piper synthesis process failed"}), 500

        if response_format == "wav":
            with open(wav_path, "rb") as f:
                audio_bytes = f.read()
            mime = "audio/wav"
        else:
            # Convert WAV to MP3 using ffmpeg
            with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp_mp3:
                mp3_path = tmp_mp3.name

            ffmpeg_cmd = [
                "ffmpeg", "-y", "-i", wav_path,
                "-codec:a", "libmp3lame", "-b:a", "128k", mp3_path
            ]
            ffmpeg_proc = subprocess.run(ffmpeg_cmd, capture_output=True)

            if ffmpeg_proc.returncode != 0:
                print(f"[FFmpeg Error]: {ffmpeg_proc.stderr.decode()}", flush=True)
                with open(wav_path, "rb") as f:
                    audio_bytes = f.read()
                mime = "audio/wav"
            else:
                with open(mp3_path, "rb") as f:
                    audio_bytes = f.read()
                mime = "audio/mpeg"
                os.remove(mp3_path)

        return Response(audio_bytes, mimetype=mime)

    finally:
        if os.path.exists(wav_path):
            os.remove(wav_path)

if __name__ == "__main__":
    print("[Piper Engine] Starting server on 0.0.0.0:5000", flush=True)
    app.run(host="0.0.0.0", port=5000, debug=False)
