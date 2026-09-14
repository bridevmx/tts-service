import os
import sys
import time
import subprocess
import tempfile
import threading
import urllib.request
import shutil
from flask import Flask, request, Response, jsonify

app = Flask(__name__)

CACHE_DIR = os.getenv("PIPER_CACHE_DIR", "/data")
VOICES_DIR = os.path.join(CACHE_DIR, "voices")
os.makedirs(VOICES_DIR, exist_ok=True)

# Default voice to pre-warm on server startup (avoids cold-start latency on first request)
WARMUP_VOICE = os.getenv("PIPER_WARMUP_VOICE", "es_MX-ald-medium")

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
    },
    "es_ES-carlfm-x_low": {
        "onnx": "https://huggingface.co/rhasspy/piper-voices/resolve/main/es/es_ES/carlfm/x_low/es_ES-carlfm-x_low.onnx",
        "json": "https://huggingface.co/rhasspy/piper-voices/resolve/main/es/es_ES/carlfm/x_low/es_ES-carlfm-x_low.onnx.json"
    },
    "es_ES-sharvard-medium": {
        "onnx": "https://huggingface.co/rhasspy/piper-voices/resolve/main/es/es_ES/sharvard/medium/es_ES-sharvard-medium.onnx",
        "json": "https://huggingface.co/rhasspy/piper-voices/resolve/main/es/es_ES/sharvard/medium/es_ES-sharvard-medium.onnx.json"
    },
    "es_AR-css10-medium": {
        "onnx": "https://huggingface.co/rhasspy/piper-voices/resolve/main/es/es_AR/css10/medium/es_AR-css10-medium.onnx",
        "json": "https://huggingface.co/rhasspy/piper-voices/resolve/main/es/es_AR/css10/medium/es_AR-css10-medium.onnx.json"
    }
}

# Kokoro-ONNX model URLs
KOKORO_MODEL_URL = "https://github.com/thewhitetulip/kokoro-onnx/releases/download/v0.3.0/kokoro-v1.0.onnx"
KOKORO_VOICES_URL = "https://github.com/thewhitetulip/kokoro-onnx/releases/download/v0.3.0/voices-v1.0.json"

kokoro_instance = None

def get_kokoro():
    global kokoro_instance
    if kokoro_instance is not None:
        return kokoro_instance

    try:
        from kokoro_onnx import Kokoro
        onnx_path = os.path.join(CACHE_DIR, "kokoro-v1.0.onnx")
        json_path = os.path.join(CACHE_DIR, "voices-v1.0.json")

        # Check if prebundled files exist in /app/prebundled_voices
        pre_onnx = "/app/prebundled_voices/kokoro-v1.0.onnx"
        pre_json = "/app/prebundled_voices/voices-v1.0.json"
        if not os.path.exists(onnx_path) and os.path.exists(pre_onnx):
            shutil.copy(pre_onnx, onnx_path)
        if not os.path.exists(json_path) and os.path.exists(pre_json):
            shutil.copy(pre_json, json_path)

        if not os.path.exists(onnx_path) or not os.path.exists(json_path):
            print(f"[Kokoro Engine] Downloading Kokoro-ONNX model to {CACHE_DIR}...", flush=True)
            dl_start = time.time()
            if not os.path.exists(onnx_path):
                urllib.request.urlretrieve(KOKORO_MODEL_URL, onnx_path)
            if not os.path.exists(json_path):
                urllib.request.urlretrieve(KOKORO_VOICES_URL, json_path)
            print(f"[Kokoro Engine] Downloaded Kokoro model in {round((time.time() - dl_start)*1000)} ms.", flush=True)

        kokoro_instance = Kokoro(onnx_path, json_path)
        print("[Kokoro Engine] Loaded Kokoro-ONNX model into memory successfully.", flush=True)
        return kokoro_instance
    except Exception as e:
        print(f"[Kokoro Engine Info] Could not load Kokoro-ONNX: {e}", flush=True)
        return None

def ensure_voice_downloaded(voice_id):
    if voice_id not in VOICE_MAP:
        print(f"[Piper Engine] Voice '{voice_id}' not found in map. Falling back to 'es_MX-ald-medium'.", flush=True)
        voice_id = "es_MX-ald-medium"

    onnx_path = os.path.join(VOICES_DIR, f"{voice_id}.onnx")
    json_path = os.path.join(VOICES_DIR, f"{voice_id}.onnx.json")

    if not os.path.exists(onnx_path) or not os.path.exists(json_path):
        print(f"[Piper Engine] Downloading voice model '{voice_id}' from HuggingFace to {VOICES_DIR}...", flush=True)
        urls = VOICE_MAP[voice_id]
        dl_start = time.time()
        urllib.request.urlretrieve(urls["onnx"], onnx_path)
        urllib.request.urlretrieve(urls["json"], json_path)
        dl_duration = round((time.time() - dl_start) * 1000)
        print(f"[Piper Engine] Voice model '{voice_id}' downloaded successfully in {dl_duration} ms.", flush=True)
    else:
        print(f"[Piper Engine] Using cached voice model for '{voice_id}'.", flush=True)

    return onnx_path

@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "healthy",
        "service": "tts-engine-multi",
        "engines": ["piper", "kokoro", "melotts"]
    }), 200

@app.route("/v1/audio/speech", methods=["POST"])
def synthesize_speech():
    req_start = time.time()
    data = request.get_json(force=True, silent=True) or {}
    input_text = data.get("input", "").strip()
    model_param = (data.get("model") or "piper").lower()
    version_param = (data.get("version") or "v1").lower()
    voice_id = data.get("voice") or "es_MX-ald-medium"
    speed = float(data.get("speed", 1.0))
    response_format = (data.get("response_format") or "mp3").lower()

    if not input_text:
        print("[TTS Engine Debug] Rejected request: Empty input text.", flush=True)
        return jsonify({"error": "input text is required"}), 400

    print(f"[TTS Engine Debug] Request model='{model_param}', version='{version_param}', voice='{voice_id}', text ({len(input_text)} chars)", flush=True)

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_wav:
        wav_path = tmp_wav.name

    try:
        # Route 1: Kokoro-82M ONNX engine
        k_instance = get_kokoro() if model_param in ["kokoro", "tts-1-hd", "kokoro-82m"] else None
        if (model_param in ["kokoro", "tts-1-hd", "kokoro-82m"]) and k_instance is not None:
            try:
                import soundfile as sf
                print(f"[TTS Engine Debug] Synthesizing with Kokoro-ONNX...", flush=True)
                # Default spanish voice in kokoro-onnx
                kokoro_voice = "ef_dora" if "female" in voice_id.lower() or "sharvard" in voice_id.lower() else "em_alex"
                samples, sample_rate = k_instance.create(input_text, voice=kokoro_voice, speed=speed, lang="es")
                sf.write(wav_path, samples, sample_rate)
            except Exception as e:
                print(f"[TTS Engine Error] Kokoro synthesis failed ({e}), falling back to Piper.", flush=True)
                model_param = "piper"

        # Route 2: Piper engine (default and robust fallback)
        if model_param not in ["kokoro", "tts-1-hd"] or k_instance is None:
            onnx_path = ensure_voice_downloaded(voice_id)
            length_scale = str(max(0.5, min(2.0, 1.0 / speed))) if speed > 0 else "1.0"
            piper_exe = shutil.which("piper") or os.path.join(os.path.dirname(sys.executable), "piper") or "piper"
            cmd = [
                piper_exe,
                "--model", onnx_path,
                "--output_file", wav_path,
                "--length_scale", length_scale
            ]

            piper_start = time.time()
            proc = subprocess.Popen(
                cmd,
                stdin=subprocess.PIPE,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            _, stderr = proc.communicate(input=input_text + "\n")
            piper_duration = round((time.time() - piper_start) * 1000)

            if proc.returncode != 0:
                print(f"[Piper Engine Error] Piper CLI return code {proc.returncode}: {stderr}", flush=True)
                return jsonify({"error": f"Piper synthesis process failed: {stderr}"}), 500

            print(f"[Piper Engine Debug] Piper synthesis generated WAV in {piper_duration} ms.", flush=True)

        if response_format == "wav":
            with open(wav_path, "rb") as f:
                audio_bytes = f.read()
            mime = "audio/wav"
        else:
            with tempfile.NamedTemporaryFile(suffix=".mp3", delete=False) as tmp_mp3:
                mp3_path = tmp_mp3.name

            ffmpeg_start = time.time()
            ffmpeg_cmd = [
                "ffmpeg", "-y", "-i", wav_path,
                "-codec:a", "libmp3lame", "-b:a", "128k", mp3_path
            ]
            ffmpeg_proc = subprocess.run(ffmpeg_cmd, capture_output=True)
            ffmpeg_duration = round((time.time() - ffmpeg_start) * 1000)

            if ffmpeg_proc.returncode != 0:
                print(f"[FFmpeg Error] {ffmpeg_proc.stderr.decode()}", flush=True)
                with open(wav_path, "rb") as f:
                    audio_bytes = f.read()
                mime = "audio/wav"
            else:
                print(f"[TTS Engine Debug] FFmpeg converted WAV to MP3 in {ffmpeg_duration} ms.", flush=True)
                with open(mp3_path, "rb") as f:
                    audio_bytes = f.read()
                mime = "audio/mpeg"
                os.remove(mp3_path)

        total_req_time = round((time.time() - req_start) * 1000)
        print(f"[TTS Engine Debug] Request finished in {total_req_time} ms. Returning {len(audio_bytes)} bytes.", flush=True)
        return Response(audio_bytes, mimetype=mime)

    finally:
        if os.path.exists(wav_path):
            os.remove(wav_path)

def warmup_all_engines():
    """Download and pre-warm Piper and Kokoro models at startup to eliminate cold-start latency."""
    # 1. Warm-up Piper default voice
    try:
        print(f"[Piper Engine] Warming up default voice model '{WARMUP_VOICE}'...", flush=True)
        warmup_start = time.time()
        ensure_voice_downloaded(WARMUP_VOICE)
        warmup_duration = round((time.time() - warmup_start) * 1000)
        print(f"[Piper Engine] Piper warm-up complete for '{WARMUP_VOICE}' in {warmup_duration} ms.", flush=True)
    except Exception as e:
        print(f"[Piper Engine Warning] Piper warm-up failed for '{WARMUP_VOICE}': {e}", flush=True)

    # 2. Warm-up Kokoro-ONNX model into RAM
    try:
        print("[Kokoro Engine] Pre-warming Kokoro-ONNX model in background...", flush=True)
        k_start = time.time()
        k = get_kokoro()
        if k is not None:
            # Perform a micro dummy synthesis in memory to warm up ONNX session tensors
            _samples, _sr = k.create("Hola", voice="em_alex", speed=1.0, lang="es")
            print(f"[Kokoro Engine] Kokoro-ONNX pre-warm complete in {round((time.time() - k_start)*1000)} ms.", flush=True)
    except Exception as e:
        print(f"[Kokoro Engine Warning] Kokoro warm-up warning: {e}", flush=True)

if __name__ == "__main__":
    print("[TTS Engine] Starting server on 0.0.0.0:5000", flush=True)
    # Pre-download and pre-warm models in background thread so Flask starts immediately
    threading.Thread(target=warmup_all_engines, daemon=True).start()
    app.run(host="0.0.0.0", port=5000, debug=False)
