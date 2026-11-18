"""Build Voice_Server_Colab_Free.ipynb - every engine on one free Colab link (Claude, 2026-11-16).

User: "make sure all engine work , fix it". The notebook is a small starter: it downloads the server code from
the private Kaggle dataset fw-colab-voice-server (publish_colab_server.py), installs each engine in its own venv,
fetches the Claude-trained voice, and starts colab_server/front.py, which prints ONE gradio.live link serving
Indic-Parler (Aman, Rohit, Divya, Rani, FavoriteWorld), Chatterbox (Vishal + clones), Qwen3-TTS and IndicF5 with
the same endpoint names as the Hugging Face spaces.

Needs two Colab Secrets: HF_TOKEN and KAGGLE_API_TOKEN (values from clausd/.env). Free Google account = free GPU.
Run:  python studios/voiceover-studio/claude-training/build_colab_server.py
"""
from __future__ import annotations

import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
OUT = HERE / "Voice_Server_Colab_Free.ipynb"

INTRO = r"""# Favorite World voice server - every engine, free Colab

**Aman · Rohit · Divya · Rani · FavoriteWorld (trained) · Chatterbox (Vishal + your clones) · Qwen3-TTS (English) · IndicF5**, all on one link.

1. Use a **free** Google account (a Colab Pro account spends paid units). Runtime → Change runtime type → **T4 GPU**.
2. 🔑 Secrets (left bar): `HF_TOKEN` and `KAGGLE_API_TOKEN` (values from `clausd/.env`), Notebook access **on**.
3. Runtime → **Run all**. The link appears after ~3 minutes; Aman/Rohit work first, the other engines come online over the next 10-15 minutes (first run only installs; the status box on the link's page shows each engine).
4. Give the link to Claude, or paste it into Voiceover Studio → Cloud GPU & Keys → colab_gradio_url (saved for every browser).

The server code is downloaded fresh from your private Kaggle dataset each run, so fixes arrive without re-uploading this notebook."""

CELL_SETUP = r'''# CELL 1 - keys, server code, engines (first run ~10 min; the link in Cell 2 starts working for Aman after ~3 min)
import os, glob, subprocess
os.environ["USE_TF"] = "0"; os.environ["TRANSFORMERS_NO_TF"] = "1"
from google.colab import userdata
for k in ("HF_TOKEN", "KAGGLE_API_TOKEN"):
    try:
        os.environ[k] = userdata.get(k) or ""
    except Exception:
        os.environ[k] = ""
    print(k, "found" if os.environ[k] else "MISSING - add it in the key icon (Secrets) and run again")
!nvidia-smi -L
!pip install -q "kaggle>=1.8"
!kaggle datasets download alek6835210/fw-colab-voice-server -p /content/fwsrv --unzip --force -q
print("server files:", sorted(os.listdir("/content/fwsrv")))
# the Claude-trained FavoriteWorld voice (from the Kaggle training notebook output)
!kaggle kernels output alek6835210/fw-voice-claude-train -p /content/fwtrained --file-pattern "fw_claude_voice/model/[^/]+$" -q
hits = glob.glob("/content/fwtrained/**/fw_claude_voice/model/config.json", recursive=True)
os.environ["FW_TRAINED_DIR"] = os.path.dirname(hits[0]) if hits else ""
print("trained voice:", os.environ["FW_TRAINED_DIR"] or "not found")
# engines install side by side in the background; Cell 2 starts the link right away
subprocess.Popen("bash /content/fwsrv/setup_all.sh > /content/fwsetup.log 2>&1", shell=True)
print("installing engines in the background - log: /content/fwsetup.log")'''

CELL_RUN = r'''# CELL 2 - start the link (keep this tab open). Engines come online as their installs finish.
import time, os
for _ in range(180):          # wait for the Parler venv (needed first)
    if os.path.exists("/content/fwvenvs/parler/.done"):
        break
    time.sleep(5)
!tail -n 20 /content/fwsetup.log
!cd /content/fwsrv && python front.py'''


def code(src: str) -> dict:
    return {"cell_type": "code", "metadata": {}, "execution_count": None, "outputs": [],
            "source": src.splitlines(keepends=True)}


def main() -> None:
    nb = {"cells": [{"cell_type": "markdown", "metadata": {}, "source": INTRO.splitlines(keepends=True)},
                    code(CELL_SETUP), code(CELL_RUN)],
          "metadata": {"accelerator": "GPU", "colab": {"provenance": [], "gpuType": "T4"},
                       "kernelspec": {"display_name": "Python 3", "name": "python3"},
                       "language_info": {"name": "python"}}, "nbformat": 4, "nbformat_minor": 5}
    OUT.write_text(json.dumps(nb, ensure_ascii=False, indent=1), encoding="utf-8")
    print("wrote", OUT)


if __name__ == "__main__":
    main()
