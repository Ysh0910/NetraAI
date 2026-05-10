"""
N.E.T.R.A. Comms Microservice
FastAPI server for Speech-to-Text (Vosk) and Text-to-Speech (Piper)
"""

import os
import io
import shutil
import subprocess
import tempfile
import logging
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, UploadFile, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydub import AudioSegment
from vosk import Model, KaldiRecognizer

# ─────────────────────────────────────────────────────────────
#  CONFIGURATION & PATHS
# ─────────────────────────────────────────────────────────────

BASE_DIR = Path(__file__).parent
# Allow model path override via environment variable for easy A/B testing
VOSK_MODEL_PATH = Path(os.getenv("VOSK_MODEL_PATH", BASE_DIR / "models" / "vosk"))
PIPER_MODEL_PATH = BASE_DIR / "models" / "piper"
TEMP_DIR = BASE_DIR / "temp"
AUDIO_OUTPUT_DIR = BASE_DIR / "audio_output"

def find_piper_executable():
    """Find Piper executable from common locations or PATH."""
    # Check env var first
    env_piper = os.getenv("PIPER_EXECUTABLE")
    if env_piper and shutil.which(env_piper):
        return env_piper
    
    # Check PATH
    if shutil.which("piper"):
        return "piper"
    
    # Check common Windows locations
    common_paths = [
        r"C:\Program Files\piper\piper\piper.exe",
        r"C:\Tools\piper\piper.exe",
        r"C:\piper\piper.exe",
    ]
    for path in common_paths:
        if os.path.exists(path):
            return path
    
    # Fallback to env var or default
    return env_piper or "piper"

PIPER_EXECUTABLE = find_piper_executable()
DEFAULT_VOICE_SPEED = 1.0
SAMPLE_RATE = 16000

# Ensure directories exist
TEMP_DIR.mkdir(exist_ok=True)
AUDIO_OUTPUT_DIR.mkdir(exist_ok=True)

# ─────────────────────────────────────────────────────────────
#  LOGGING SETUP
# ─────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────
#  MODEL INITIALIZATION
# ─────────────────────────────────────────────────────────────

vosk_model: Optional[Model] = None
vosk_ready = False
piper_ready = False


def check_models():
    """Check if required models are present. Log warnings but don't crash."""
    global vosk_ready, piper_ready

    # Check Vosk model (look recursively for .mdl or .bin files)
    if VOSK_MODEL_PATH.exists():
        model_files = list(VOSK_MODEL_PATH.rglob("*.bin")) + list(VOSK_MODEL_PATH.rglob("*.mdl"))
        if model_files:
            vosk_ready = True
            logger.info(f"[COMMS] Vosk model found: {len(model_files)} file(s) including {model_files[0].name}")
        else:
            logger.warning(f"[COMMS] Vosk model directory empty (no .bin/.mdl files): {VOSK_MODEL_PATH}")
    else:
        logger.warning(f"[COMMS] Vosk model directory not found: {VOSK_MODEL_PATH}")

    # Check Piper model
    if PIPER_MODEL_PATH.exists():
        onnx_files = list(PIPER_MODEL_PATH.glob("*.onnx"))
        if onnx_files:
            piper_ready = True
            logger.info(f"[COMMS] Piper model found: {onnx_files[0].name}")
        else:
            logger.warning(f"[COMMS] Piper model directory empty (no .onnx files): {PIPER_MODEL_PATH}")
    else:
        logger.warning(f"[COMMS] Piper model directory not found: {PIPER_MODEL_PATH}")

    if not vosk_ready or not piper_ready:
        logger.warning("[COMMS] Some models missing. Endpoints will return 503 until models are added.")


def init_vosk():
    """Initialize Vosk model if available."""
    global vosk_model, vosk_ready
    if not vosk_ready:
        return
    try:
        vosk_model = Model(str(VOSK_MODEL_PATH))
        logger.info("[COMMS] Vosk model loaded successfully")
    except Exception as e:
        logger.error(f"[COMMS] Failed to load Vosk model: {e}")
        vosk_ready = False


# Run checks at startup
check_models()
init_vosk()

# ─────────────────────────────────────────────────────────────
#  FASTAPI APP SETUP
# ─────────────────────────────────────────────────────────────

app = FastAPI(
    title="N.E.T.R.A. Comms Microservice",
    description="Speech-to-Text (Vosk) and Text-to-Speech (Piper) service for N.E.T.R.A.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve audio files statically
app.mount("/audio", StaticFiles(directory=AUDIO_OUTPUT_DIR), name="audio")


# ─────────────────────────────────────────────────────────────
#  HEALTH CHECK ENDPOINT
# ─────────────────────────────────────────────────────────────

@app.get("/health")
def health_check():
    """Return service health status."""
    return {
        "status": "ok",
        "vosk_ready": vosk_ready,
        "piper_ready": piper_ready,
        "vosk_model_path": str(VOSK_MODEL_PATH),
        "piper_model_path": str(PIPER_MODEL_PATH)
    }


# ─────────────────────────────────────────────────────────────
#  STT ENDPOINT (Speech-to-Text)
# ─────────────────────────────────────────────────────────────

@app.post("/stt")
async def speech_to_text(audio: UploadFile = File(...)):
    """
    Convert audio file to text using Vosk.
    Accepts various formats (webm, opus, mp3, wav) and converts to 16kHz mono WAV.
    """
    if not vosk_ready:
        raise HTTPException(
            status_code=503,
            detail="Vosk model not loaded. Please add model files to models/vosk/"
        )

    temp_files = []
    try:
        # Validate file type
        allowed_extensions = ('.webm', '.opus', '.mp3', '.wav', '.ogg', '.m4a', '.mp4')
        if not audio.filename.lower().endswith(allowed_extensions):
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported audio format. Allowed: {allowed_extensions}"
            )

        # Read uploaded file
        audio_bytes = await audio.read()
        if len(audio_bytes) == 0:
            raise HTTPException(status_code=400, detail="Empty audio file")

        # Create temp input file
        input_ext = Path(audio.filename).suffix or '.webm'
        with tempfile.NamedTemporaryFile(delete=False, suffix=input_ext, dir=TEMP_DIR) as tmp_input:
            tmp_input.write(audio_bytes)
            input_path = tmp_input.name
            temp_files.append(input_path)

        # Convert to 16kHz mono WAV using pydub
        wav_path = str(Path(input_path).with_suffix('.wav'))
        temp_files.append(wav_path)

        try:
            audio_segment = AudioSegment.from_file(input_path)
            # Convert to mono, 16kHz, 16-bit
            audio_segment = audio_segment.set_channels(1).set_frame_rate(SAMPLE_RATE).set_sample_width(2)
            audio_segment.export(wav_path, format="wav")
        except Exception as e:
            logger.error(f"[STT] Audio conversion failed: {e}")
            raise HTTPException(status_code=400, detail=f"Audio conversion failed: {str(e)}")

        # Process with Vosk
        recognizer = KaldiRecognizer(vosk_model, SAMPLE_RATE)
        recognizer.SetWords(True)

        with open(wav_path, "rb") as wav_file:
            while True:
                data = wav_file.read(4000)
                if len(data) == 0:
                    break
                recognizer.AcceptWaveform(data)

        result = recognizer.FinalResult()
        import json
        result_data = json.loads(result)

        text = result_data.get("text", "")
        confidence = result_data.get("result", [{}])[0].get("conf", 0.0) if result_data.get("result") else 0.0

        logger.info(f"[STT] Transcribed: '{text[:50]}...' (confidence: {confidence:.2f})")

        return JSONResponse(content={
            "text": text,
            "confidence": confidence,
            "success": True
        })

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[STT] Processing error: {e}")
        raise HTTPException(status_code=500, detail=f"STT processing error: {str(e)}")
    finally:
        # Cleanup temp files
        for temp_file in temp_files:
            try:
                if os.path.exists(temp_file):
                    os.remove(temp_file)
            except Exception as e:
                logger.warning(f"[STT] Failed to cleanup temp file {temp_file}: {e}")


# ─────────────────────────────────────────────────────────────
#  TTS ENDPOINT (Text-to-Speech)
# ─────────────────────────────────────────────────────────────

class TTSRequest:
    """Pydantic model for TTS request."""
    def __init__(self, text: str, voice_speed: float = DEFAULT_VOICE_SPEED):
        self.text = text
        self.voice_speed = voice_speed


@app.post("/tts")
async def text_to_speech(
    text: str = Form(...),
    voice_speed: float = Form(DEFAULT_VOICE_SPEED),
    return_url: bool = Form(True)
):
    """
    Convert text to speech using Piper.
    Returns audio URL or file based on return_url parameter.
    """
    if not piper_ready:
        raise HTTPException(
            status_code=503,
            detail="Piper model not loaded. Please add .onnx model to models/piper/"
        )

    if not text or not text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty")

    try:
        # Find the first .onnx file in models/piper
        onnx_files = list(PIPER_MODEL_PATH.glob("*.onnx"))
        if not onnx_files:
            raise HTTPException(status_code=503, detail="No .onnx model found in models/piper/")

        model_file = onnx_files[0]

        # Generate unique filename for audio_output directory
        import uuid
        audio_id = str(uuid.uuid4())[:8]
        output_filename = f"tts_{audio_id}.wav"
        output_path = AUDIO_OUTPUT_DIR / output_filename

        # Build Piper command
        cmd = [
            PIPER_EXECUTABLE,
            "--model", str(model_file),
            "--output_file", str(output_path),
            "--sentence-silence", "0.2"
        ]

        if voice_speed != 1.0:
            logger.info(f"[TTS] Voice speed {voice_speed} requested (not yet implemented with Piper)")

        logger.info(f"[TTS] Generating: '{text[:50]}...' -> {output_filename}")

        # Verify Piper executable exists
        if not shutil.which(PIPER_EXECUTABLE):
            raise HTTPException(
                status_code=503,
                detail=f"Piper executable not found: {PIPER_EXECUTABLE}"
            )

        # Run Piper
        process = subprocess.run(
            cmd,
            input=text.encode('utf-8'),
            capture_output=True,
            timeout=30
        )

        if process.returncode != 0:
            stderr = process.stderr.decode('utf-8', errors='ignore')
            logger.error(f"[TTS] Piper failed: {stderr}")
            raise HTTPException(status_code=500, detail=f"TTS generation failed: {stderr}")

        if not output_path.exists() or output_path.stat().st_size == 0:
            raise HTTPException(status_code=500, detail="TTS generated empty audio file")

        logger.info(f"[TTS] Generated: {output_path} ({output_path.stat().st_size} bytes)")

        if return_url:
            # Return URL for frontend to fetch
            return JSONResponse(content={
                "audio_url": f"/audio/{output_filename}",
                "text": text,
                "filename": output_filename,
                "success": True
            })
        else:
            # Return file directly
            return FileResponse(
                path=output_path,
                media_type="audio/wav",
                filename=output_filename
            )

    except HTTPException:
        raise
    except subprocess.TimeoutExpired:
        logger.error("[TTS] Piper timeout")
        raise HTTPException(status_code=504, detail="TTS generation timeout")
    except Exception as e:
        logger.error(f"[TTS] Processing error: {e}")
        raise HTTPException(status_code=500, detail=f"TTS processing error: {str(e)}")


@app.get("/audio/{filename}")
async def get_audio_file(filename: str):
    """
    Serve a generated audio file by filename.
    """
    file_path = AUDIO_OUTPUT_DIR / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Audio file not found")
    
    return FileResponse(
        path=file_path,
        media_type="audio/wav",
        filename=filename
    )


# ─────────────────────────────────────────────────────────────
#  MQTT SUBSCRIBER FOR PI AI RESPONSES
# ─────────────────────────────────────────────────────────────

import threading
import json
import urllib.request
import paho.mqtt.client as mqtt

MQTT_BROKER = os.getenv("MQTT_BROKER", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
MQTT_TOPIC_AI_RESPONSE = "battlefield/ai-response"
DASHBOARD_URL = os.getenv("DASHBOARD_URL", "http://localhost:3000")

mqtt_client = None
mqtt_connected = False


def generate_tts_for_ai_response(text: str) -> Optional[str]:
    """Generate TTS audio for AI response and return URL."""
    global piper_ready, PIPER_MODEL_PATH, PIPER_EXECUTABLE, AUDIO_OUTPUT_DIR
    
    if not piper_ready:
        logger.error("[MQTT] Piper not ready, cannot generate TTS")
        return None
    
    try:
        # Find the first .onnx file
        onnx_files = list(PIPER_MODEL_PATH.glob("*.onnx"))
        if not onnx_files:
            logger.error("[MQTT] No .onnx model found")
            return None
        
        model_file = onnx_files[0]
        
        # Generate unique filename
        import uuid
        audio_id = str(uuid.uuid4())[:8]
        output_filename = f"ai_response_{audio_id}.wav"
        output_path = AUDIO_OUTPUT_DIR / output_filename
        
        # Build Piper command
        cmd = [
            PIPER_EXECUTABLE,
            "--model", str(model_file),
            "--output_file", str(output_path),
            "--sentence-silence", "0.2"
        ]
        
        logger.info(f"[MQTT] Generating TTS for AI response: '{text[:50]}...'")
        
        # Run Piper
        process = subprocess.run(
            cmd,
            input=text.encode('utf-8'),
            capture_output=True,
            timeout=30
        )
        
        if process.returncode != 0:
            stderr = process.stderr.decode('utf-8', errors='ignore')
            logger.error(f"[MQTT] TTS generation failed: {stderr}")
            return None
        
        if not output_path.exists() or output_path.stat().st_size == 0:
            logger.error("[MQTT] TTS generated empty file")
            return None
        
        # Return the audio URL
        audio_url = f"http://localhost:3002/audio/{output_filename}"
        logger.info(f"[MQTT] TTS generated: {audio_url}")
        return audio_url
        
    except Exception as e:
        logger.error(f"[MQTT] TTS generation error: {e}")
        return None


def forward_to_dashboard(decision: str, audio_url: str, context: dict):
    """Forward AI response to dashboard via HTTP POST."""
    try:
        payload = {
            "decision": decision,
            "audio_url": audio_url,
            "context": context
        }
        
        url = f"{DASHBOARD_URL}/api/ai-response"
        data = json.dumps(payload).encode('utf-8')
        
        req = urllib.request.Request(
            url,
            data=data,
            headers={'Content-Type': 'application/json'},
            method='POST'
        )
        
        with urllib.request.urlopen(req, timeout=5) as response:
            if response.status == 200:
                logger.info(f"[MQTT] Forwarded AI response to dashboard: {decision[:50]}...")
            else:
                logger.warning(f"[MQTT] Dashboard returned status {response.status}")
                
    except Exception as e:
        logger.error(f"[MQTT] Failed to forward to dashboard: {e}")


def on_mqtt_message(client, userdata, msg):
    """Handle incoming AI response from Raspberry Pi."""
    try:
        payload = json.loads(msg.payload.decode('utf-8'))
        logger.info(f"[MQTT] Received AI response from Pi: {payload.get('decision', 'N/A')[:50]}...")
        
        # Extract the decision text
        decision = payload.get('decision', '')
        context = payload.get('context', {})
        
        if not decision:
            logger.warning("[MQTT] Empty decision in AI response")
            return
        
        # Generate TTS for the decision
        audio_url = generate_tts_for_ai_response(decision)
        
        # Forward to dashboard (even if TTS failed, we still send the text)
        forward_to_dashboard(decision, audio_url or "", context)
        
    except json.JSONDecodeError as e:
        logger.error(f"[MQTT] Invalid JSON in message: {e}")
    except Exception as e:
        logger.error(f"[MQTT] Error processing message: {e}")


def on_mqtt_connect(client, userdata, flags, rc):
    """Callback when connected to MQTT broker."""
    global mqtt_connected
    if rc == 0:
        mqtt_connected = True
        logger.info(f"[MQTT] Connected to broker at {MQTT_BROKER}:{MQTT_PORT}")
        client.subscribe(MQTT_TOPIC_AI_RESPONSE)
        logger.info(f"[MQTT] Subscribed to {MQTT_TOPIC_AI_RESPONSE}")
    else:
        logger.error(f"[MQTT] Connection failed with code {rc}")


def on_mqtt_disconnect(client, userdata, rc):
    """Callback when disconnected from broker."""
    global mqtt_connected
    mqtt_connected = False
    logger.warning(f"[MQTT] Disconnected from broker (rc={rc})")


def start_mqtt_subscriber():
    """Start MQTT subscriber in background thread."""
    global mqtt_client
    
    try:
        mqtt_client = mqtt.Client()
        mqtt_client.on_connect = on_mqtt_connect
        mqtt_client.on_disconnect = on_mqtt_disconnect
        mqtt_client.on_message = on_mqtt_message
        
        logger.info(f"[MQTT] Connecting to broker at {MQTT_BROKER}:{MQTT_PORT}...")
        mqtt_client.connect(MQTT_BROKER, MQTT_PORT, keepalive=60)
        mqtt_client.loop_start()
        
    except Exception as e:
        logger.error(f"[MQTT] Failed to start subscriber: {e}")


# ─────────────────────────────────────────────────────────────
#  STARTUP
# ─────────────────────────────────────────────────────────────

@app.on_event("startup")
async def startup_event():
    """Log startup info and start MQTT subscriber."""
    logger.info("=" * 60)
    logger.info("N.E.T.R.A. Comms Microservice Started")
    logger.info(f"Vosk ready: {vosk_ready}")
    logger.info(f"Piper ready: {piper_ready}")
    logger.info(f"CORS enabled for: http://localhost:3000")
    logger.info("=" * 60)
    
    # Start MQTT subscriber in background thread
    mqtt_thread = threading.Thread(target=start_mqtt_subscriber, daemon=True)
    mqtt_thread.start()


# ─────────────────────────────────────────────────────────────
#  MAIN ENTRY POINT
# ─────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3002)
