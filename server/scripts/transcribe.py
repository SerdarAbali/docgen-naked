#This file is located at /docgen/server/scripts/transcribe.py
import sys
import json
import whisper
from pathlib import Path

def transcribe_audio(audio_path):
    try:
        print(json.dumps({"progress": 10, "message": "Loading Whisper model..."}), flush=True)
        model = whisper.load_model("base")
        
        print(json.dumps({"progress": 30, "message": "Model loaded, starting transcription..."}), flush=True)
        
        # Detect language first
        print(json.dumps({"progress": 40, "message": "Detecting language..."}), flush=True)
        audio = whisper.load_audio(audio_path)
        audio = whisper.pad_or_trim(audio)
        mel = whisper.log_mel_spectrogram(audio).to(model.device)
        _, probs = model.detect_language(mel)
        
        print(json.dumps({"progress": 60, "message": "Transcribing audio..."}), flush=True)
        result = model.transcribe(audio_path)
        
        print(json.dumps({"progress": 80, "message": "Processing transcription..."}), flush=True)
        
        segments = []
        for segment in result["segments"]:
            segments.append({
                "start": segment["start"],
                "end": segment["end"],
                "text": segment["text"].strip()
            })
            
        output = {
            "text": result["text"],
            "segments": segments
        }
        
        print(json.dumps({"progress": 100, "message": "Transcription complete"}), flush=True)
        print(json.dumps({"result": output}), flush=True)
        sys.exit(0)
        
    except Exception as e:
        error = {"error": str(e)}
        print(json.dumps(error), file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(json.dumps({"error": "Audio file path required"}), file=sys.stderr)
        sys.exit(1)
        
    audio_path = sys.argv[1]
    if not Path(audio_path).exists():
        print(json.dumps({"error": f"File not found: {audio_path}"}), file=sys.stderr)
        sys.exit(1)
        
    transcribe_audio(audio_path)