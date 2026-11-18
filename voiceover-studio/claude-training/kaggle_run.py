"""Run Claude's voice training on Kaggle's free GPU from this PC (Claude, 2026-11-16).

Needs KAGGLE_API_TOKEN=... in the repo's git-ignored .env (Kaggle -> Settings -> API Tokens -> Generate New
Token), and the user's phone verified on Kaggle (needed for GPU + internet). Nothing trains on this PC.

  python studios/voiceover-studio/claude-training/kaggle_run.py whoami
  python studios/voiceover-studio/claude-training/kaggle_run.py inputs          # private dataset: HF token + channel zip
  python studios/voiceover-studio/claude-training/kaggle_run.py push smoke      # 15-min test run
  python studios/voiceover-studio/claude-training/kaggle_run.py status smoke
  python studios/voiceover-studio/claude-training/kaggle_run.py fetch smoke     # sample + eval + logs only (not the model)
  python studios/voiceover-studio/claude-training/kaggle_run.py push full       # the real ~6 h run

Files staged under out/claude_voice_kaggle/ (git-ignored). Kaggle items are private:
  dataset <user>/fw-claude-voice-inputs, notebooks <user>/fw-voice-claude-smoke and <user>/fw-voice-claude-train.
"""
from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
STAGE = ROOT / "out" / "claude_voice_kaggle"
DATASET_SLUG = "fw-claude-voice-inputs"
KERNELS = {"smoke": ("fw-voice-claude-smoke", "Train_FW_Voice_Mix_Numbers_SMOKE.ipynb"),
           "full": ("fw-voice-claude-train", "Train_FW_Voice_Mix_Numbers.ipynb"),
           "male": ("fw-voice-claude-male", "Speak_FW_Male.ipynb"),       # male samples from the trained model
           "enginetest": ("fw-voice-engine-test", "EngineTest_All.ipynb")}  # all-engines Colab server, tested on Kaggle
KERNEL_INPUTS = {"male": ["fw-voice-claude-train"], "enginetest": ["fw-voice-claude-train"]}  # notebook outputs attached read-only
EXTRA_DATASETS = {"enginetest": ["fw-colab-voice-server"]}
FETCH_PATTERN = r"(sample/.*|eval/.*\.(json|wav)|male/.*|dataset_summary\.json|train\.log|.*\.log)$"


def env_value(key: str) -> str:
    v = os.environ.get(key, "").strip()
    if v:
        return v
    env = ROOT / ".env"
    if env.exists():
        for ln in env.read_text(encoding="utf-8", errors="ignore").splitlines():
            if ln.strip().startswith(key + "="):
                return ln.split("=", 1)[1].strip().strip('"').strip("'")
    return ""


def kaggle(*args: str, check: bool = True, capture: bool = False) -> subprocess.CompletedProcess:
    env = dict(os.environ)
    tok = env_value("KAGGLE_API_TOKEN")
    if tok:
        env["KAGGLE_API_TOKEN"] = tok
    elif not (Path.home() / ".kaggle" / "kaggle.json").exists() and not (Path.home() / ".kaggle" / "access_token").exists():
        sys.exit("No Kaggle token: add KAGGLE_API_TOKEN=... to .env (Kaggle -> Settings -> API Tokens).")
    env["PYTHONIOENCODING"] = "utf-8"
    cmd = [sys.executable, "-m", "kaggle", *args]
    res = subprocess.run(cmd, env=env, text=True, encoding="utf-8", errors="replace",
                         capture_output=capture)
    if check and res.returncode != 0:
        if capture:
            print(res.stdout, res.stderr)
        sys.exit(f"kaggle {' '.join(args[:2])} failed ({res.returncode})")
    return res


def username() -> str:
    u = env_value("KAGGLE_USERNAME")
    if u:
        return u
    res = kaggle("config", "view", capture=True, check=False)
    for ln in (res.stdout or "").splitlines():
        if ln.strip().lower().startswith("- username:"):
            name = ln.split(":", 1)[1].strip()
            if name and name.lower() != "none":
                return name
    # new-style tokens: ask the API who we are by listing our own kernels
    try:
        env = dict(os.environ, KAGGLE_API_TOKEN=env_value("KAGGLE_API_TOKEN"))
        code = ("from kaggle.api.kaggle_api_extended import KaggleApi as K;a=K();a.authenticate();"
                "print(getattr(a,'get_config_value')('username') or '')")
        out = subprocess.run([sys.executable, "-c", code], env=env, text=True, capture_output=True).stdout.strip()
        if out:
            return out.splitlines()[-1]
    except Exception:
        pass
    sys.exit("Could not find your Kaggle username - add KAGGLE_USERNAME=... to .env.")


def cmd_inputs() -> None:
    user = username()
    d = STAGE / "inputs"
    d.mkdir(parents=True, exist_ok=True)
    hf = env_value("HF_TOKEN")
    if not hf:
        sys.exit("HF_TOKEN missing in .env")
    (d / "hf_token.txt").write_text(hf, encoding="utf-8")
    z = ROOT / "out" / "favorite_world_voice_dataset.zip"
    if not (d / z.name).exists() or (d / z.name).stat().st_size != z.stat().st_size:
        shutil.copy2(z, d / z.name)                       # read-only copy of the channel zip
    (d / "dataset-metadata.json").write_text(json.dumps(
        {"title": "fw-claude-voice-inputs", "id": f"{user}/{DATASET_SLUG}", "licenses": [{"name": "other"}]}, indent=1),
        encoding="utf-8")
    exists = kaggle("datasets", "files", f"{user}/{DATASET_SLUG}", check=False, capture=True).returncode == 0
    if exists:
        kaggle("datasets", "version", "-p", str(d), "-m", "update inputs", "-r", "skip", "-q")
    else:
        kaggle("datasets", "create", "-p", str(d), "-r", "skip", "-q")      # private by default
    print(f"inputs ready: {user}/{DATASET_SLUG} (private)")


def cmd_push(mode: str) -> None:
    user = username()
    slug, nb = KERNELS[mode]
    d = STAGE / f"kernel_{mode}"
    if d.exists():
        shutil.rmtree(d)
    d.mkdir(parents=True)
    shutil.copy2(HERE / nb, d / nb)
    meta = {"id": f"{user}/{slug}", "title": slug, "code_file": nb, "language": "python",
            "kernel_type": "notebook", "is_private": True, "enable_gpu": True, "enable_tpu": False,
            "enable_internet": True, "dataset_sources": [f"{user}/{d}" for d in [DATASET_SLUG] + EXTRA_DATASETS.get(mode, [])],
            "competition_sources": [], "model_sources": [],
            "kernel_sources": [f"{user}/{k}" for k in KERNEL_INPUTS.get(mode, [])],
            "machine_shape": "NvidiaTeslaT4"}
    (d / "kernel-metadata.json").write_text(json.dumps(meta, indent=1), encoding="utf-8")
    kaggle("kernels", "push", "-p", str(d))
    print(f"pushed {user}/{slug} - it runs in Kaggle's cloud now. https://www.kaggle.com/code/{user}/{slug}")


def cmd_status(mode: str) -> None:
    user = username()
    kaggle("kernels", "status", f"{user}/{KERNELS[mode][0]}")


def cmd_fetch(mode: str) -> None:
    user = username()
    out = STAGE / f"result_{mode}"
    out.mkdir(parents=True, exist_ok=True)
    kaggle("kernels", "output", f"{user}/{KERNELS[mode][0]}", "-p", str(out), "-o", "--file-pattern", FETCH_PATTERN)
    for p in sorted(out.rglob("*")):
        if p.is_file():
            print(p.relative_to(out), p.stat().st_size)


def main(argv: list[str]) -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    if not argv:
        print(__doc__)
        return
    c = argv[0]
    if c == "whoami":
        print(username())
    elif c == "inputs":
        cmd_inputs()
    elif c in ("push", "status", "fetch") and len(argv) > 1 and argv[1] in KERNELS:
        {"push": cmd_push, "status": cmd_status, "fetch": cmd_fetch}[c](argv[1])
    else:
        print(__doc__)


if __name__ == "__main__":
    main(sys.argv[1:])
