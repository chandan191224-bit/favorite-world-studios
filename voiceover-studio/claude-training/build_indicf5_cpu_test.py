"""Build IndicF5_CPU_Test.ipynb - checks the IndicF5 engine on a CPU-only Kaggle machine (no GPU queue).
(Claude, 2026-11-16: the GPU engine test sat in Kaggle's shared GPU queue; 8/9 engines already passed on GPU.)
Installs only the IndicF5 venv exactly like setup_all.sh, starts backend_indicf5.py, calls it with voice_gen."""
from __future__ import annotations

import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE / "IndicF5_CPU_Test.ipynb"

CELL = r'''import os, glob, shutil, subprocess, sys, time, json
tok = glob.glob("/kaggle/input/**/hf_token.txt", recursive=True)
os.environ["HF_TOKEN"] = open(tok[0]).read().strip()
src = os.path.dirname(glob.glob("/kaggle/input/**/front.py", recursive=True)[0])
shutil.copytree(src, "/tmp/fwsrv", dirs_exist_ok=True)
V = "/tmp/fwvenvs/indicf5"
t0 = time.time()
subprocess.run(f"python -m venv --without-pip {V}", shell=True, check=True)      # fully separate, like setup_all.sh mk_iso
r = subprocess.run(f'python -m pip --python {V}/bin/python install -q torch torchaudio "git+https://github.com/ai4bharat/IndicF5.git" "transformers==4.49.0" faster-whisper soundfile librosa "gradio>=5" requests',
                   shell=True, capture_output=True, text=True)
print("install", r.returncode, f"{time.time() - t0:.0f}s", r.stderr[-1500:], flush=True)
log = open("/kaggle/working/indicf5.log", "w")
proc = subprocess.Popen([f"{V}/bin/python", "/tmp/fwsrv/backend_indicf5.py", "7864"], stdout=log, stderr=subprocess.STDOUT,
                        cwd="/tmp/fwsrv", env={k: v for k, v in os.environ.items() if k != "PYTHONPATH"} | {"MPLBACKEND": "Agg", "PYTHONNOUSERSITE": "1"})
import requests
for _ in range(300):
    time.sleep(2)
    try:
        if requests.get("http://127.0.0.1:7864/config", timeout=2).ok:
            break
    except Exception:
        pass
print("backend up:", proc.poll() is None, flush=True)
sys.path.insert(0, "/tmp/fwsrv")
import voice_gen as vg
ref = glob.glob("/kaggle/input/**/speaker_ref.wav", recursive=True) or glob.glob("/kaggle/input/**/*.wav", recursive=True)
os.makedirs("/kaggle/working/enginetest", exist_ok=True)
t = time.time()
try:
    wav = vg.tts_indicf5_bytes("दोस्तों, सन 1947 में भारत आज़ाद हुआ, और सिर्फ़ 3 साल बाद संविधान लागू हो गया।",
                               ref_audio=vg.Path(ref[0]), space_url="http://127.0.0.1:7864")
    open("/kaggle/working/enginetest/indicf5_clone_hi.wav", "wb").write(wav)
    res = {"ok": True, "seconds_audio": round(vg.wav_duration_secs(wav), 2), "wait": round(time.time() - t, 1)}
except Exception as e:
    res = {"ok": False, "error": str(e)[:800], "wait": round(time.time() - t, 1)}
print("indicf5_clone_hi", res, flush=True)
json.dump(res, open("/kaggle/working/enginetest/indicf5_report.json", "w"))
print(open("/kaggle/working/indicf5.log", errors="replace").read()[-2500:])
proc.terminate()'''


def main() -> None:
    nb = {"cells": [{"cell_type": "code", "metadata": {}, "execution_count": None, "outputs": [],
                     "source": CELL.splitlines(keepends=True)}],
          "metadata": {"kernelspec": {"display_name": "Python 3", "name": "python3"}, "language_info": {"name": "python"}},
          "nbformat": 4, "nbformat_minor": 5}
    OUT.write_text(json.dumps(nb, ensure_ascii=False, indent=1), encoding="utf-8")
    print("wrote", OUT)


if __name__ == "__main__":
    main()
