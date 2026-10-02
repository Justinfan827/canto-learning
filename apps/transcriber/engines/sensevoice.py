# SenseVoice-Small (via sherpa-onnx) for the Pause & Ask transcriber. Silero VAD cuts the audio into
# speech segments, SenseVoice transcribes each (converted to HK Traditional), and lines print as "[start --> end] text" as they finish.
# Usage: python sensevoice.py MODEL_DIR VAD_ONNX AUDIO.wav [LANGUAGE]
import re
import sys
import wave

import numpy as np
import opencc
import sherpa_onnx

# SenseVoice writes Simplified characters; show them as Hong Kong Traditional.
to_hk = opencc.OpenCC("s2hk")
# Simplified 系 is ambiguous, and OpenCC often turns the Cantonese copula 係 into 系/繫.
COPULA = re.compile(r"[系繫](?![統列數譜])")
KEEP = re.compile(r"(聯|維|關|體|派|星|直)係")
MAX_CHARS = 22


def hk(text):
    text = COPULA.sub("係", to_hk.convert(text))
    return KEEP.sub(lambda m: m.group(1) + ("繫" if m.group(1) in "聯維" else "係" if m.group(1) == "關" else "系"), text)


def split_long(text, start, end):
    """Splits a long segment at punctuation, sharing its time out by character count."""
    parts = [p for p in re.split(r"(?<=[，。？！、,.?!])", text) if p.strip()]
    chunks = []
    for p in parts:
        if chunks and len(chunks[-1]) + len(p) <= MAX_CHARS:
            chunks[-1] += p
        else:
            chunks.append(p)
    total = sum(len(c) for c in chunks) or 1
    t = start
    for c in chunks:
        d = (end - start) * len(c) / total
        yield c.strip(), t, t + d
        t += d

model_dir, vad_path, wav_path = sys.argv[1:4]
language = sys.argv[4] if len(sys.argv) > 4 else "yue"

recognizer = sherpa_onnx.OfflineRecognizer.from_sense_voice(
    model=f"{model_dir}/model.int8.onnx",
    tokens=f"{model_dir}/tokens.txt",
    language=language,
    use_itn=True,
    num_threads=4,
)

config = sherpa_onnx.VadModelConfig()
config.silero_vad.model = vad_path
config.silero_vad.min_silence_duration = 0.25
config.silero_vad.max_speech_duration = 8
config.sample_rate = 16000
vad = sherpa_onnx.VoiceActivityDetector(config, buffer_size_in_seconds=60)

with wave.open(wav_path) as f:
    assert f.getframerate() == 16000 and f.getnchannels() == 1
    samples = np.frombuffer(f.readframes(f.getnframes()), dtype=np.int16).astype(np.float32) / 32768


def ts(sec):
    h, rem = divmod(sec, 3600)
    m, s = divmod(rem, 60)
    return f"{int(h):02d}:{int(m):02d}:{s:06.3f}"


def drain():
    while not vad.empty():
        seg = vad.front
        stream = recognizer.create_stream()
        stream.accept_waveform(16000, seg.samples)
        recognizer.decode_stream(stream)
        text = hk(stream.result.text.strip())
        start = seg.start / 16000
        end = start + len(seg.samples) / 16000
        for chunk, a, b in split_long(text, start, end):
            print(f"[{ts(a)} --> {ts(b)}] {chunk.rstrip('，、,')}", flush=True)
        vad.pop()


window = config.silero_vad.window_size
for i in range(0, len(samples), window):
    vad.accept_waveform(samples[i : i + window])
    drain()
vad.flush()
drain()
