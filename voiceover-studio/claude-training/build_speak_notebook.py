"""Build Speak_FW_Male.ipynb (Claude, 2026-11-16): male voiceover samples on Kaggle, nothing on the PC.

User: "try male voiceover". Uses the trained model from the Kaggle notebook fw-voice-claude-train (attached as an
input, read only) and the original ai4bharat/indic-parler-tts male speakers (Rohit, Aman). Each voice gets 3 takes;
Whisper (clearest reading) + pitch (male range) pick the best take. Output: /kaggle/working/male/*.wav + report.json.

Run:  python build_speak_notebook.py  then  python kaggle_run.py push male
"""
from __future__ import annotations

import json
from pathlib import Path

import build_notebook as B

HERE = Path(__file__).resolve().parent
OUT = HERE / "Speak_FW_Male.ipynb"

MALE_SCRIPT = r'''"""fw_male.py - male voiceover takes, best one picked by Whisper + pitch."""
from fw_voice import *
import shutil, librosa
from faster_whisper import WhisperModel

TEXT = ("सन 1971 की सर्दियों में, ढाका में 93,000 पाकिस्तानी सैनिकों ने हथियार डाल दिए। "
        "सिर्फ़ 13 दिन की जंग ने, एशिया का नक्शा बदल दिया।")
VOICES = {   # name: (model, description)
    "trained_fw_male": ("trained", "FavoriteWorld speaks in a deep, warm, confident male Hindi documentary narrator voice "
                                   "with natural pacing, very clear audio and no background noise."),
    "original_rohit_male": ("base", "Rohit speaks in a deep, confident male voice at a moderate pace, like a documentary "
                                    "narrator, with very clear, close-up audio and no background noise."),
    "original_aman_male": ("base", "Aman speaks in a deep, confident male voice at a moderate pace, like a documentary "
                                   "narrator, with very clear, close-up audio and no background noise."),
}
TAKES = 3
OUT = "/kaggle/working/male"
os.makedirs(os.path.join(OUT, "takes"), exist_ok=True)


def load16k(path):
    a, sr0 = sf.read(path, dtype="float32")
    if a.ndim > 1:
        a = a.mean(axis=1)
    return librosa.resample(a, orig_sr=sr0, target_sr=16000).astype(np.float32)


def words(t):
    t = fwn.normalize(t)
    return re.sub(r"[^\wऀ-ॿ\s]", " ", t.lower()).split()


def cer(ref, hyp):
    a, b = "".join(words(ref)), "".join(words(hyp))
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1] / max(len(a), 1)


def pitch(path):
    y, sr0 = librosa.load(path, sr=16000)
    f0, voiced, _ = librosa.pyin(y, fmin=60, fmax=400, sr=16000)
    f0 = f0[~np.isnan(f0)]
    return float(np.median(f0)) if f0.size else 0.0


takes = []
for kind in ("trained", "base"):
    names = [n for n, (k, _) in VOICES.items() if k == kind]
    if not names:
        continue
    voice = load_voice(kind)
    for name in names:
        for t in range(1, TAKES + 1):
            torch.manual_seed(1000 + t)
            wav, sr, spoken = speak(voice, TEXT, desc=VOICES[name][1])
            p = os.path.join(OUT, "takes", f"{name}_take{t}.wav")
            sf.write(p, wav, sr)
            takes.append({"name": name, "take": t, "path": p, "seconds": round(len(wav) / sr, 1)})
            print(name, "take", t, takes[-1]["seconds"], "s")
    del voice; gc.collect(); torch.cuda.empty_cache()

try:
    asr = WhisperModel("large-v3", device="cuda", compute_type="float16")
except Exception as e:
    print("Whisper GPU failed:", e, "- CPU")
    asr = WhisperModel("large-v3", device="cpu", compute_type="int8")
for tk in takes:
    segs, _ = asr.transcribe(load16k(tk["path"]), language="hi", beam_size=5)
    tk["heard"] = " ".join(s.text for s in segs).strip()
    tk["cer"] = round(cer(TEXT, tk["heard"]), 3)
    tk["pitch_hz"] = round(pitch(tk["path"]), 1)
    # lower is better: reading errors, plus a penalty if it doesn't sound male (median pitch above ~165 Hz)
    # or falls outside 10-20 s
    tk["score"] = round(tk["cer"] + (0.5 if tk["pitch_hz"] > 165 else 0) + (0.3 if not 10 <= tk["seconds"] <= 20 else 0), 3)
    print(tk["name"], tk["take"], "cer", tk["cer"], "pitch", tk["pitch_hz"], "Hz", tk["seconds"], "s |", tk["heard"])

best = {}
for tk in takes:
    if tk["name"] not in best or tk["score"] < best[tk["name"]]["score"]:
        best[tk["name"]] = tk
for name, tk in best.items():
    shutil.copy(tk["path"], os.path.join(OUT, name + ".wav"))
    print(f"BEST {name}: take {tk['take']}, {tk['seconds']} s, pitch {tk['pitch_hz']} Hz, cer {tk['cer']}")
json.dump({"text": TEXT, "spoken": fwn.normalize(TEXT), "best": best, "takes": takes},
          open(os.path.join(OUT, "report.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
'''

CELL_FIND_MODEL = r'''# CELL 3 - Find the trained model (output of the notebook fw-voice-claude-train, attached read-only)
import glob
cands = [p for p in glob.glob("/kaggle/input/**/fw_claude_voice/model/config.json", recursive=True)]
print("trained model:", cands)
if not cands:
    raise SystemExit("Trained model not found in the attached notebook output.")
TRAINED_ROOT = os.path.dirname(os.path.dirname(cands[0]))      # .../fw_claude_voice
open("fw_voice.py", "w", encoding="utf-8").write(VOICE_MODULE)
open("fw_male.py", "w", encoding="utf-8").write(MALE_SCRIPT)
SMOKE_FLAG = "0"'''

CELL_RUN = ('# CELL 4 - Make the male takes in a fresh Python and pick the best\n'
            '!USE_TF=0 TRANSFORMERS_NO_TF=1 FW_OUT_ROOT="{TRAINED_ROOT}" FW_PARLER_DIR="{PARLER_DIR}" FW_SMOKE=0 '
            'python fw_male.py 2>&1 | tee /kaggle/working/male.log\n'
            'print(sorted(glob.glob("/kaggle/working/male/*.wav")))')


def main() -> None:
    numbers_src = B.FW_NUMBERS.read_text(encoding="utf-8")
    cells = [
        B.md("# Favorite World - male voiceover samples (Claude)\nTrained voice vs original Rohit / Aman, 3 takes each, "
             "best take picked by Whisper + pitch."),
        B.code(B.CELL_SETUP),
        B.code(B.CELL_NUMBERS_HEAD + "# CELL 2 - number reader\n" + numbers_src),
        B.code(f"VOICE_MODULE = {B.VOICE_MODULE!r}\nMALE_SCRIPT = {MALE_SCRIPT!r}\n" + CELL_FIND_MODEL),
        B.code(CELL_RUN),
    ]
    nb = {"cells": cells, "metadata": {"kernelspec": {"display_name": "Python 3", "name": "python3"},
                                       "language_info": {"name": "python"}}, "nbformat": 4, "nbformat_minor": 5}
    OUT.write_text(json.dumps(nb, ensure_ascii=False, indent=1), encoding="utf-8")
    print("wrote", OUT)


if __name__ == "__main__":
    main()
