"""Chatterbox Multilingual backend (Hindi + English, voice cloning: Vishal, your Instant Clones). Own venv.
Endpoint: generate_tts_audio(text, language_id, ref_audio, exaggeration, temperature, seed, cfg_weight) - same as
the ResembleAI space. Install steps are Antigravity's, verified live on Colab (2026-11-16). Loads on first use and
frees the GPU when idle (lazy_gpu.py). Kaggle engine test 2026-11-16: default Hindi, clone Hindi, English all OK."""
import os, sys, types, tempfile
for mod in ("pkuseg", "spacy_pkuseg"):          # optional Chinese tokenizers - not needed for hi/en
    try:
        __import__(mod)
    except Exception:
        sys.modules[mod] = types.ModuleType(mod)
import numpy as np, torch, soundfile as sf, gradio as gr
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fw_numbers as fwn
from lazy_gpu import LazyModel

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 7862
device = "cuda" if torch.cuda.is_available() else "cpu"


def _load():
    from chatterbox.mtl_tts import ChatterboxMultilingualTTS
    return ChatterboxMultilingualTTS.from_pretrained(device=device)


MODEL = LazyModel("chatterbox", _load)
print("chatterbox ready (loads on first use)", flush=True)


def generate_tts_audio(text_input, language_id, audio_prompt_path_input, exaggeration_input, temperature_input,
                       seed_num_input, cfgw_input):
    model = MODEL.get()
    if int(seed_num_input or 0) > 0:
        torch.manual_seed(int(seed_num_input))
    lang = (language_id or "hi")[:2]
    kwargs = dict(language_id=lang, exaggeration=float(exaggeration_input or 0.55),
                  temperature=float(temperature_input or 0.75), cfg_weight=float(cfgw_input or 0.5))
    if audio_prompt_path_input:
        kwargs["audio_prompt_path"] = audio_prompt_path_input
    with torch.no_grad():
        wav = model.generate(fwn.normalize(text_input or "", lang="hi" if lang == "hi" else "en"), **kwargs)
    arr = wav.squeeze().detach().cpu().numpy().astype(np.float32)
    out = tempfile.NamedTemporaryFile(suffix=".wav", delete=False).name
    sf.write(out, arr, int(model.sr))
    MODEL.touch()
    return out


def fw_unload():
    MODEL.unload()
    return 'ok'


with gr.Blocks() as demo:
    t = gr.Textbox(); l = gr.Textbox(); r = gr.Audio(type="filepath")
    ex = gr.Number(); tp = gr.Number(); sd = gr.Number(); cf = gr.Number(); o = gr.Audio(type="filepath")
    gr.Button().click(generate_tts_audio, [t, l, r, ex, tp, sd, cf], [o], api_name="generate_tts_audio")
    u_out = gr.Textbox()
    gr.Button().click(fw_unload, [], [u_out], api_name="fw_unload")
demo.queue(default_concurrency_limit=1).launch(server_name="127.0.0.1", server_port=PORT, share=False, show_error=True)
