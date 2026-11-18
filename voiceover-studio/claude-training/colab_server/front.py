"""Favorite World voice server - ONE public link for every engine (Claude, 2026-11-16).

User: "make sure all engine work , fix it". The free Hugging Face spaces (Chatterbox, IndicF5, Qwen,
AI4Bharat Parler) only give a few GPU minutes a day, so every engine runs here on the user's free Colab T4.
Each engine lives in its own Python venv (they need different library versions) and listens on 127.0.0.1;
this front exposes the SAME endpoint names as the Hugging Face spaces, so voice_gen.py works unchanged:

  generate_finetuned            -> Indic-Parler (Aman, Rohit, Divya, Rani, FavoriteWorld)
  generate_tts_audio            -> Chatterbox Multilingual (Vishal clone, Instant Clones, default voice)
  on_language_change            -> (Chatterbox default voice: returns nothing = model's own default voice)
  synthesize_speech             -> IndicF5 clone
  generate_custom_voice / generate_voice_design / generate_voice_clone -> Qwen3-TTS (English)
  fw_status                     -> which engines are ready
"""
import os, subprocess, sys, threading, time
import requests
import gradio as gr
from gradio_client import Client, handle_file

HERE = os.path.dirname(os.path.abspath(__file__))
VENVS = os.environ.get("FW_VENVS", "/content/fwvenvs")
LOGS = os.environ.get("FW_LOGS", "/content/fwlogs")
os.makedirs(LOGS, exist_ok=True)
ENGINES = {   # name: (port, script)
    "parler": (7861, "backend_parler.py"),
    "chatterbox": (7862, "backend_chatterbox.py"),
    "qwen": (7863, "backend_qwen.py"),
    "indicf5": (7864, "backend_indicf5.py"),
}
STATE = {k: {"state": "starting", "detail": ""} for k in ENGINES}
CLIENTS = {}


ISOLATED = ("indicf5",)          # setup_all.sh mk_iso: nothing shared with the machine


def _engine_env(name):
    """Environment for an engine process. Notebooks set MPLBACKEND to their inline plot backend, which the
    engines' matplotlib can't load (Kaggle CPU test: "module://matplotlib_inline.backend_inline is not a valid
    value for backend"); isolated engines must not see the machine's library paths either."""
    env = dict(os.environ)
    env["MPLBACKEND"] = "Agg"
    if name in ISOLATED:
        env.pop("PYTHONPATH", None)
        env["PYTHONNOUSERSITE"] = "1"
    return env


def _start(name):
    port, script = ENGINES[name]
    py = os.path.join(VENVS, name, "bin", "python")
    done = os.path.join(VENVS, name, ".done")
    STATE[name] = {"state": "installing", "detail": ""}
    for _ in range(1200):                      # setup_all.sh may still be installing it (up to 40 min)
        if os.path.exists(done):
            break
        if os.path.exists(os.path.join(VENVS, name, ".failed")):
            log = os.path.join(LOGS, f"setup_{name}.log")
            tail = open(log, errors="replace").read()[-600:] if os.path.exists(log) else ""
            STATE[name] = {"state": "install failed", "detail": tail}
            print(f"[{name}] install failed:\n{tail}", flush=True)
            return
        time.sleep(2)
    STATE[name] = {"state": "starting", "detail": ""}
    if not os.path.exists(done):
        STATE[name] = {"state": "not installed", "detail": f"{py} missing (see {LOGS}/setup_{name}.log)"}
        return
    log = open(os.path.join(LOGS, f"{name}.log"), "w")
    proc = subprocess.Popen([py, os.path.join(HERE, script), str(port)], stdout=log, stderr=subprocess.STDOUT,
                            env=_engine_env(name), cwd=HERE)
    for _ in range(900):                       # up to 30 min for downloads + loading
        if proc.poll() is not None:
            tail = open(os.path.join(LOGS, f"{name}.log"), errors="replace").read()[-600:]
            STATE[name] = {"state": "failed", "detail": tail}
            print(f"[{name}] FAILED:\n{tail}", flush=True)
            return
        try:
            if requests.get(f"http://127.0.0.1:{port}/config", timeout=2).ok:
                CLIENTS[name] = Client(f"http://127.0.0.1:{port}/", verbose=False)
                STATE[name] = {"state": "ready", "detail": ""}
                print(f"[{name}] ready", flush=True)
                return
        except Exception:
            pass
        time.sleep(2)
    STATE[name] = {"state": "failed", "detail": "did not start in 30 min"}


def _start_all():
    # Parler first (the voices the user uses most), then the rest one by one so the GPU loads stay calm
    for name in ("parler", "chatterbox", "qwen", "indicf5"):
        _start(name)


def _client(name):
    if name not in CLIENTS:
        st = STATE[name]
        raise gr.Error(f"{name} engine is {st['state']} on Colab. {st['detail'][-200:]}")
    return CLIENTS[name]


HEAVY = ("chatterbox", "qwen", "indicf5")


def _make_room(name):
    """One heavy engine on the GPU at a time (Kaggle test: Qwen ran out of GPU memory with all loaded)."""
    for other in HEAVY:
        if other != name and other in CLIENTS:
            try:
                CLIENTS[other].predict(api_name="/fw_unload")
            except Exception as e:
                print(f"[{other}] unload skipped: {e}", flush=True)


def _heavy(name):
    c = _client(name)
    _make_room(name)
    return c


def _f(path):
    return handle_file(path) if path else None


def generate_finetuned(text, description):
    return _client("parler").predict(text, description, api_name="/generate_finetuned")


def generate_tts_audio(text, language_id, ref_audio, exaggeration, temperature, seed, cfg_weight):
    return _heavy("chatterbox").predict(text, language_id, _f(ref_audio), exaggeration, temperature, seed,
                                         cfg_weight, api_name="/generate_tts_audio")


def on_language_change(language_id, ref_audio, text):
    return None          # Chatterbox then uses its own default voice for that language


def synthesize_speech(text, ref_audio, ref_text):
    return _heavy("indicf5").predict(text, _f(ref_audio), ref_text, api_name="/synthesize_speech")


def generate_custom_voice(text, language, speaker, instruct, model_size):
    return _heavy("qwen").predict(text, language, speaker, instruct, model_size, api_name="/generate_custom_voice")


def generate_voice_design(text, language, description):
    return _heavy("qwen").predict(text, language, description, api_name="/generate_voice_design")


def generate_voice_clone(ref_audio, ref_text, text, language, use_xvector_only, model_size):
    return _heavy("qwen").predict(_f(ref_audio), ref_text, text, language, bool(use_xvector_only), model_size,
                                   api_name="/generate_voice_clone")


def fw_status():
    return {k: v["state"] for k, v in STATE.items()}


threading.Thread(target=_start_all, daemon=True).start()

with gr.Blocks(title="Favorite World voice server") as demo:
    gr.Markdown("# Favorite World voice server (free Colab) - every engine on one link\n"
                "Paste this page's link into Voiceover Studio → Cloud GPU & Keys → colab_gradio_url.")
    status = gr.JSON(label="Engines")
    gr.Button("Refresh status").click(fw_status, [], [status], api_name="fw_status")
    o = gr.Audio(type="filepath", label="Output")
    with gr.Row(visible=False):
        t, d = gr.Textbox(), gr.Textbox()
        gr.Button().click(generate_finetuned, [t, d], [o], api_name="generate_finetuned")
        ct, cl, cr = gr.Textbox(), gr.Textbox(), gr.Audio(type="filepath")
        ce, cte, cs, cc = gr.Number(), gr.Number(), gr.Number(), gr.Number()
        gr.Button().click(generate_tts_audio, [ct, cl, cr, ce, cte, cs, cc], [o], api_name="generate_tts_audio")
        ll, lr, lt = gr.Textbox(), gr.Audio(type="filepath"), gr.Textbox()
        gr.Button().click(on_language_change, [ll, lr, lt], [o], api_name="on_language_change")
        it, ir, irt = gr.Textbox(), gr.Audio(type="filepath"), gr.Textbox()
        gr.Button().click(synthesize_speech, [it, ir, irt], [o], api_name="synthesize_speech")
        qt, ql, qs, qi, qm = gr.Textbox(), gr.Textbox(), gr.Textbox(), gr.Textbox(), gr.Textbox()
        gr.Button().click(generate_custom_voice, [qt, ql, qs, qi, qm], [o], api_name="generate_custom_voice")
        dt, dl, dd = gr.Textbox(), gr.Textbox(), gr.Textbox()
        gr.Button().click(generate_voice_design, [dt, dl, dd], [o], api_name="generate_voice_design")
        vr, vrt, vt, vl, vx, vm = gr.Audio(type="filepath"), gr.Textbox(), gr.Textbox(), gr.Textbox(), gr.Checkbox(), gr.Textbox()
        gr.Button().click(generate_voice_clone, [vr, vrt, vt, vl, vx, vm], [o], api_name="generate_voice_clone")
    demo.load(fw_status, [], [status])

print("Starting the public link. Engines load in the background - Parler first (~3 min), then Chatterbox, Qwen, IndicF5.")
demo.queue(default_concurrency_limit=4).launch(share=True, debug=True, show_error=True)
