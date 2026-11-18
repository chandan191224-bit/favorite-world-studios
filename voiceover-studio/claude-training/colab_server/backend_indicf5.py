"""AI4Bharat IndicF5 backend (Indian voice cloning from a reference clip). Own venv (transformers pinned).
Endpoint: synthesize_speech(text, ref_audio, ref_text) - same as the AI4Bharat space. If no reference transcript is
given, Whisper writes one (IndicF5 needs the words of the reference clip). Loads on first use, frees the GPU idle.
Kaggle engine test 2026-11-16: newer transformers build models on the "meta" device, and IndicF5's mel filterbank
(torchaudio) can't be made there ("Tensor on device cpu is not on the expected device meta") - so the venv pins an
older transformers (setup_all.sh) and loading uses low_cpu_mem_usage=False (plain CPU init, then .to(cuda)).
Needs the Hugging Face account to have clicked "Agree" on https://huggingface.co/ai4bharat/IndicF5 (done 2026-11-16)."""
import os, sys, tempfile
import numpy as np, soundfile as sf, gradio as gr
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fw_numbers as fwn
from lazy_gpu import LazyModel

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 7864


def _load():
    import torch
    from transformers import AutoModel
    m = AutoModel.from_pretrained("ai4bharat/IndicF5", trust_remote_code=True, low_cpu_mem_usage=False,
                                  token=os.environ.get("HF_TOKEN"))
    if torch.cuda.is_available():
        m = m.to("cuda")
    return m


MODEL = LazyModel("indicf5", _load)
_ASR = {}
print("indicf5 ready (loads on first use)", flush=True)


def _transcribe(path):
    if "m" not in _ASR:
        # CPU on purpose: the reference clip is a few seconds (2-3 s to transcribe) and Whisper's GPU mode needs
        # CUDA libraries this venv may not have (Kaggle test 4: "libcublas.so.12 is not found")
        from faster_whisper import WhisperModel
        _ASR["m"] = WhisperModel("small", device="cpu", compute_type="int8")
    # give Whisper raw 16 kHz audio - its own file reader (PyAV) breaks with "metadata_errors" (Kaggle test 3)
    import librosa
    audio, _ = librosa.load(path, sr=16000, mono=True)
    segs, _ = _ASR["m"].transcribe(audio.astype(np.float32), language="hi", beam_size=5)
    return " ".join(s.text for s in segs).strip()


def synthesize_speech(text, ref_audio, ref_text):
    if not ref_audio:
        raise gr.Error("IndicF5 needs a reference voice clip")
    rt = (ref_text or "").strip() or _transcribe(ref_audio)
    model = MODEL.get()
    audio = model(fwn.normalize(text or ""), ref_audio_path=ref_audio, ref_text=rt)
    audio = np.asarray(audio)
    if audio.dtype == np.int16:
        audio = audio.astype(np.float32) / 32768.0
    out = tempfile.NamedTemporaryFile(suffix=".wav", delete=False).name
    sf.write(out, audio.astype(np.float32).squeeze(), 24000)
    MODEL.touch()
    return out


def fw_unload():
    MODEL.unload()
    return 'ok'


with gr.Blocks() as demo:
    t = gr.Textbox(); r = gr.Audio(type="filepath"); rt = gr.Textbox(); o = gr.Audio(type="filepath")
    gr.Button().click(synthesize_speech, [t, r, rt], [o], api_name="synthesize_speech")
    u_out = gr.Textbox()
    gr.Button().click(fw_unload, [], [u_out], api_name="fw_unload")
demo.queue(default_concurrency_limit=1).launch(server_name="127.0.0.1", server_port=PORT, share=False, show_error=True)
