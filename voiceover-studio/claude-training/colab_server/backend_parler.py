"""Indic-Parler backend (Aman, Rohit, Divya, Rani + Claude-trained FavoriteWorld). Own venv (transformers 4.46).
Endpoint: generate_finetuned(text, description) - same as the AI4Bharat space / Voiceover Studio."""
import os, re, sys, tempfile
os.environ.setdefault("USE_TF", "0")
os.environ.setdefault("TRANSFORMERS_NO_TF", "1")
import numpy as np, torch, soundfile as sf, gradio as gr
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import fw_numbers as fwn
from parler_tts import ParlerTTSForConditionalGeneration
from transformers import AutoTokenizer

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 7861
DEVICE = "cuda:0" if torch.cuda.is_available() else "cpu"
NAME = "ai4bharat/indic-parler-tts"
TRAINED_DIR = os.environ.get("FW_TRAINED_DIR", "")


def _load(path, token=None):
    m = ParlerTTSForConditionalGeneration.from_pretrained(path, token=token).to(DEVICE).eval()
    if DEVICE.startswith("cuda"):
        m = m.half()
    return m, AutoTokenizer.from_pretrained(path, token=token)


VOICES = {"base": _load(NAME, os.environ.get("HF_TOKEN"))}
if TRAINED_DIR and os.path.exists(os.path.join(TRAINED_DIR, "config.json")):
    VOICES["trained"] = _load(TRAINED_DIR)
desc_tok = AutoTokenizer.from_pretrained(VOICES["base"][0].config.text_encoder._name_or_path)
SR = VOICES["base"][0].config.sampling_rate
DEFAULT_DESC = ("Aman speaks in a deep, confident male voice at a moderate pace, like a documentary narrator, "
                "with very clear, close-up audio and no background noise.")
print("parler voices ready:", list(VOICES), flush=True)


def chunks(text, limit=200):
    out = []
    for p in re.split(r"(?<=[।.!?])\s+", text.strip()):
        while len(p) > limit:
            cut = p.rfind(",", 0, limit)
            cut = cut if cut > 40 else limit
            out.append(p[:cut + 1].strip()); p = p[cut + 1:].strip()
        if p:
            out.append(p)
    return out


def _say(model, tok, d, text_chunk):
    p = tok(text_chunk, return_tensors="pt").to(DEVICE)
    with torch.no_grad():
        g = model.generate(input_ids=d.input_ids, attention_mask=d.attention_mask,
                           prompt_input_ids=p.input_ids, prompt_attention_mask=p.attention_mask)
    return g.float().cpu().numpy().squeeze()


def generate_finetuned(text_input, description_input):
    desc = (description_input or "").strip() or DEFAULT_DESC
    trained = desc.startswith("FavoriteWorld") and "trained" in VOICES
    model, tok = VOICES["trained" if trained else "base"]
    text = re.sub(r"\[[^\[\]]{1,32}\]", " ", text_input or "")
    text = fwn.normalize(text.replace("|", ","))
    d = desc_tok(desc, return_tensors="pt").to(DEVICE)
    pieces = []
    for c in chunks(text):
        if trained:   # the trained voice sometimes skips words: 2 takes, keep the length that fits the text
            expect = max(1.0, len(c) * 0.075)
            wav = min((_say(model, tok, d, c) for _ in range(2)), key=lambda w: abs(len(w) / SR - expect))
        else:
            wav = _say(model, tok, d, c)
        pieces += [wav, np.zeros(int(SR * 0.12), dtype=np.float32)]
    wav = np.concatenate(pieces) if pieces else np.zeros(1, dtype=np.float32)
    out = tempfile.NamedTemporaryFile(suffix=".wav", delete=False).name
    sf.write(out, wav, SR)
    return out


with gr.Blocks() as demo:
    t = gr.Textbox(); d = gr.Textbox(); o = gr.Audio(type="filepath")
    gr.Button().click(generate_finetuned, [t, d], [o], api_name="generate_finetuned")
demo.queue(default_concurrency_limit=1).launch(server_name="127.0.0.1", server_port=PORT, share=False, show_error=True)
