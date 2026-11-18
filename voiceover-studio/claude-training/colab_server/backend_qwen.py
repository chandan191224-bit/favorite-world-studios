"""Qwen3-TTS backend (English: 9 named speakers, Voice Design from a description, Voice Clone). Own venv (qwen-tts).
Endpoints match the Qwen space used by voice_gen.tts_qwen_bytes:
  generate_custom_voice(text, language, speaker, instruct, model_size)
  generate_voice_design(text, language, description)
  generate_voice_clone(ref_audio, ref_text, text, language, use_xvector_only, model_size)
One Qwen model on the GPU at a time, loaded on first use, freed when idle (Kaggle engine test 2026-11-16: with
everything preloaded the T4 ran out of memory - "CUBLAS_STATUS_ALLOC_FAILED")."""
import gc, os, sys, tempfile, threading
import numpy as np, torch, soundfile as sf, gradio as gr
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fw_numbers as fwn
from lazy_gpu import LazyModel

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 7863
IDS = {"custom": "Qwen/Qwen3-TTS-12Hz-1.7B-CustomVoice", "design": "Qwen/Qwen3-TTS-12Hz-1.7B-VoiceDesign",
       "clone": "Qwen/Qwen3-TTS-12Hz-1.7B-Base"}
DTYPE = torch.float16 if os.environ.get("QWEN_DTYPE", "float16") == "float16" else torch.float32   # T4: no bf16
MODELS = {}
SWAP = threading.Lock()


def _loader(kind):
    def load():
        from qwen_tts import Qwen3TTSModel
        return Qwen3TTSModel.from_pretrained(IDS[kind], device_map="cuda:0", dtype=DTYPE, attn_implementation="sdpa")
    return load


for k in IDS:
    MODELS[k] = LazyModel(f"qwen-{k}", _loader(k))
print("qwen ready (loads on first use)", flush=True)


def get(kind):
    with SWAP:                     # keep only one of the three Qwen models on the GPU
        for k, m in MODELS.items():
            if k != kind and m.obj is not None:
                with m.lock:
                    m._free()
                print(f"[qwen-{k}] unloaded to make room for {kind}", flush=True)
        return MODELS[kind].get()


def _save(kind, wavs, sr):
    arr = np.asarray(wavs[0], dtype=np.float32).squeeze()
    out = tempfile.NamedTemporaryFile(suffix=".wav", delete=False).name
    sf.write(out, arr, int(sr))
    MODELS[kind].touch()
    return out


def _txt(t):
    return fwn.normalize(t or "", lang="en")


def generate_custom_voice(text, language, speaker, instruct, model_size):
    kw = dict(text=_txt(text), language=language or "English", speaker=speaker or "Ryan")
    if (instruct or "").strip():
        kw["instruct"] = instruct.strip()
    with torch.no_grad():
        return _save("custom", *get("custom").generate_custom_voice(**kw))


def generate_voice_design(text, language, description):
    with torch.no_grad():
        return _save("design", *get("design").generate_voice_design(
            text=_txt(text), language=language or "English",
            instruct=(description or "Deep, warm, authoritative male documentary narrator, calm and crisp.")))


def generate_voice_clone(ref_audio, ref_text, text, language, use_xvector_only, model_size):
    kw = dict(text=_txt(text), language=language or "English", ref_audio=ref_audio)
    if (ref_text or "").strip() and not use_xvector_only:
        kw["ref_text"] = ref_text.strip()
    else:
        kw["x_vector_only_mode"] = True
    with torch.no_grad():
        return _save("clone", *get("clone").generate_voice_clone(**kw))


def fw_unload():
    [m.unload() for m in MODELS.values()]
    return 'ok'


with gr.Blocks() as demo:
    a, b, c, d, e = gr.Textbox(), gr.Textbox(), gr.Textbox(), gr.Textbox(), gr.Textbox()
    o = gr.Audio(type="filepath")
    gr.Button().click(generate_custom_voice, [a, b, c, d, e], [o], api_name="generate_custom_voice")
    a2, b2, c2 = gr.Textbox(), gr.Textbox(), gr.Textbox()
    gr.Button().click(generate_voice_design, [a2, b2, c2], [o], api_name="generate_voice_design")
    r3, rt3, t3, l3, x3, m3 = gr.Audio(type="filepath"), gr.Textbox(), gr.Textbox(), gr.Textbox(), gr.Checkbox(), gr.Textbox()
    gr.Button().click(generate_voice_clone, [r3, rt3, t3, l3, x3, m3], [o], api_name="generate_voice_clone")
    u_out = gr.Textbox()
    gr.Button().click(fw_unload, [], [u_out], api_name="fw_unload")
demo.queue(default_concurrency_limit=1).launch(server_name="127.0.0.1", server_port=PORT, share=False, show_error=True)
