"""Build EngineTest_All.ipynb - tests the all-engines Colab voice server on Kaggle's GPU (Claude, 2026-11-16).

Installs every engine exactly like Colab (colab_server/setup_all.sh), starts colab_server/front.py, then calls it
with the studio's own production/pipeline/voice_gen.py functions (Indic-Parler, Chatterbox default + clone,
IndicF5 clone, Qwen custom/design/clone) and saves one WAV per engine + report.json.
Push:  python kaggle_run.py push enginetest
"""
from __future__ import annotations

import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE / "EngineTest_All.ipynb"

CELL = r'''import os, glob, json, shutil, subprocess, sys, time, traceback
os.environ["USE_TF"] = "0"; os.environ["TRANSFORMERS_NO_TF"] = "1"
tok = glob.glob("/kaggle/input/**/hf_token.txt", recursive=True)
os.environ["HF_TOKEN"] = open(tok[0]).read().strip()
src = os.path.dirname(glob.glob("/kaggle/input/**/front.py", recursive=True)[0])
shutil.copytree(src, "/tmp/fwsrv", dirs_exist_ok=True)
hits = glob.glob("/kaggle/input/**/fw_claude_voice/model/config.json", recursive=True)
os.environ["FW_TRAINED_DIR"] = os.path.dirname(hits[0]) if hits else ""
os.environ["FW_VENVS"] = "/tmp/fwvenvs"; os.environ["FW_LOGS"] = "/kaggle/working/logs"
print("trained:", os.environ["FW_TRAINED_DIR"], "| files:", os.listdir("/tmp/fwsrv"), flush=True)
t0 = time.time()
subprocess.run("bash /tmp/fwsrv/setup_all.sh", shell=True)
print(f"setup {time.time() - t0:.0f}s", flush=True)
for f in sorted(glob.glob("/kaggle/working/logs/setup_*.log")):
    print("==", f, "\n", open(f, errors="replace").read()[-800:], flush=True)'''

CELL2 = r'''import requests
front = subprocess.Popen([sys.executable, "/tmp/fwsrv/front.py"], stdout=open("/kaggle/working/logs/front.log", "w"),
                         stderr=subprocess.STDOUT, cwd="/tmp/fwsrv", env=dict(os.environ))
from gradio_client import Client
st = {}
for i in range(240):                       # up to 40 min for all engines
    time.sleep(10)
    try:
        st = Client("http://127.0.0.1:7860/", verbose=False).predict(api_name="/fw_status")
    except Exception as e:
        st = {"front": str(e)[:80]}
    if i % 6 == 0:
        print(f"{(i + 1) * 10}s", st, flush=True)
    if isinstance(st, dict) and st and all(v in ("ready", "failed", "not installed", "install failed") for v in st.values()):
        break
print("FINAL STATUS", st, flush=True)
for f in sorted(glob.glob("/kaggle/working/logs/*.log")):
    if "setup_" not in f:
        print("==", f, "\n", open(f, errors="replace").read()[-1500:], flush=True)'''

CELL3 = r'''sys.path.insert(0, "/tmp/fwsrv")
import voice_gen as vg
B = "http://127.0.0.1:7860"
OUT = "/kaggle/working/enginetest"; os.makedirs(OUT, exist_ok=True)
ref = glob.glob("/kaggle/input/**/speaker_ref.wav", recursive=True) or glob.glob("/kaggle/input/**/*.wav", recursive=True)
REF = vg.Path(ref[0]) if ref else None
print("reference clip:", REF, flush=True)
HI = "दोस्तों, सन 1947 में भारत आज़ाद हुआ, और सिर्फ़ 3 साल बाद संविधान लागू हो गया।"
EN = "In 1947, India became free, and just three years later the constitution came into force."
tests = {
    "parler_aman": lambda: vg.tts_indic_parler_bytes(HI, voice="Aman", space_url=B),
    "parler_favoriteworld": lambda: vg.tts_indic_parler_bytes(HI, voice="FavoriteWorld", space_url=B),
    "chatterbox_default_hi": lambda: vg.tts_chatterbox_bytes(HI, lang="hi", space_url=B),
    "chatterbox_clone_hi": lambda: vg.tts_chatterbox_bytes(HI, lang="hi", ref_audio=REF, space_url=B),
    "chatterbox_en": lambda: vg.tts_chatterbox_bytes(EN, lang="en", space_url=B),
    "indicf5_clone_hi": lambda: vg.tts_indicf5_bytes(HI, ref_audio=REF, space_url=B),
    "qwen_ryan_en": lambda: vg.tts_qwen_bytes(EN, voice="Ryan", space_url=B),
    "qwen_design_en": lambda: vg.tts_qwen_bytes(EN, voice="design", space_url=B),
    "qwen_clone_en": lambda: vg.tts_qwen_bytes(EN, ref_audio=REF, space_url=B),
}
report = {}
for name, fn in tests.items():
    t = time.time()
    try:
        wav = fn()
        open(f"{OUT}/{name}.wav", "wb").write(wav)
        report[name] = {"ok": True, "seconds_audio": round(vg.wav_duration_secs(wav), 2), "wait": round(time.time() - t, 1)}
    except Exception as e:
        report[name] = {"ok": False, "error": (str(e) or repr(e))[:500], "wait": round(time.time() - t, 1)}
    print(name, report[name], flush=True)
json.dump(report, open(f"{OUT}/report.json", "w"), indent=1, ensure_ascii=False)
print("PASSED", sum(r["ok"] for r in report.values()), "of", len(report), flush=True)
front.terminate()'''


def code(src: str) -> dict:
    return {"cell_type": "code", "metadata": {}, "execution_count": None, "outputs": [],
            "source": src.splitlines(keepends=True)}


def main() -> None:
    nb = {"cells": [code(CELL), code(CELL2), code(CELL3)],
          "metadata": {"kernelspec": {"display_name": "Python 3", "name": "python3"}, "language_info": {"name": "python"}},
          "nbformat": 4, "nbformat_minor": 5}
    OUT.write_text(json.dumps(nb, ensure_ascii=False, indent=1), encoding="utf-8")
    print("wrote", OUT)


if __name__ == "__main__":
    main()
