"""Build Train_FW_Voice_Mix_Numbers.ipynb (Claude, 2026-11-16).

The notebook fine-tunes ai4bharat/indic-parler-tts in the free cloud (Google Colab T4 or Kaggle GPU) on:
  * the Favorite World channel voice (598 clips, from Antigravity's Drive zip - read only),
  * hundreds of hours' worth of free Hindi speech sampled down to a few thousand clips - AI4Bharat
    IndicVoices-R Hindi (natural/extempore speech, CC BY 4.0), Rasa Hindi (emotional speech, CC BY 4.0),
    Google FLEURS Hindi (CC BY 4.0) - and Indian-accented English from AI4Bharat Svarah (CC BY 4.0),
  * with number-rich sentences picked first, and every transcript run through fw_numbers.py,
then scores number reading with Whisper (base model vs trained model) and serves the voice on a
gradio.live link with the same `generate_finetuned` endpoint Voiceover Studio Pro already calls.

Everything lives in its own folders so it never clashes with Antigravity's training:
  Drive: MyDrive/FavoriteWorld_Voice_Claude/   (Antigravity uses MyDrive/FavoriteWorld_Voice_Model/)
  Kaggle: /kaggle/working/fw_claude_voice/

Run:  python studios/voiceover-studio/claude-training/build_notebook.py
"""
from __future__ import annotations

import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
FW_NUMBERS = ROOT / "production" / "pipeline" / "fw_numbers.py"
OUT = HERE / "Train_FW_Voice_Mix_Numbers.ipynb"

MD_INTRO = r"""# Favorite World voice - big Hindi + English training, with numbers (Claude)

Free cloud training on a **Google Colab T4** or **Kaggle GPU**. Nothing runs on your PC.

**What it trains on**
1. Your channel voice: 598 clips (45 min) from `favorite_world_voice_dataset.zip`, repeated 3x so the model stays your voice.
2. Free Hindi speech: **AI4Bharat IndicVoices-R Hindi** (natural, everyday speech from many speakers), **Rasa Hindi** (emotional speech: happy, sad, angry, surprised...), **Google FLEURS Hindi**.
3. Free Indian-accented English: **AI4Bharat Svarah**.
4. **Numbers:** number-rich sentences are picked first from every source, and every line is written the way it is spoken (`fw_numbers.py`: "1947" -> "उन्नीस सौ सैंतालीस", "₹2.5 लाख" -> "ढाई लाख रुपये", "56.4%" -> "छप्पन दशमलव चार प्रतिशत", "B12" -> "B twelve"). The voice server runs the same converter, so you can type digits.

**One-time setup (2 minutes)**
1. Runtime -> Change runtime type -> **T4 GPU** (Kaggle: Settings -> Accelerator -> GPU T4, Internet on).
2. While signed in to Hugging Face, click **"Agree and access"** (free, instant) on each of these:
   https://huggingface.co/ai4bharat/indic-parler-tts ,
   https://huggingface.co/datasets/ai4bharat/indicvoices_r ,
   https://huggingface.co/datasets/ai4bharat/Rasa ,
   https://huggingface.co/datasets/ai4bharat/Svarah
3. Put your free HF **read** token in Colab Secrets (key icon) or Kaggle Secrets as `HF_TOKEN`, or paste it when Cell 1 asks.
4. Space: about **9 GB free in Google Drive** (one checkpoint + the final model).

**Don't clash with Antigravity:** a free Colab account runs one GPU at a time. If Antigravity's notebook is training on the same Google account, run this one on **Kaggle** (30 free GPU hours a week), or wait until Antigravity's run is done. This notebook only writes to `MyDrive/FavoriteWorld_Voice_Claude/` and never touches `FavoriteWorld_Voice_Model/`.

**If Colab disconnects:** run Cells 1-4 again (Cells 3-4 skip themselves once the audio is prepared), then Cell 5. Training continues from the last checkpoint (saved every 150 steps).

**Order:** Cell 1 -> 2 -> 3 (collect clips, ~30-60 min) -> 4 (mix) -> 5 (training, about 4-5 hours) -> 6 (helpers) -> 7 (number test: base vs trained, WAVs to listen) -> 8 (15-second sample voiceover) -> 9 (voice server link for Voiceover Studio Pro)."""

CELL_SETUP = r'''# CELL 1 - Setup (run every time). Colab or Kaggle.
import os, sys, json, glob, subprocess, getpass
os.environ["USE_TF"] = "0"              # transformers must not load Kaggle's TensorFlow (protobuf clash)
os.environ["USE_TORCH"] = "1"
os.environ["TRANSFORMERS_NO_TF"] = "1"
SMOKE = False         # True = 15-minute test on a tiny slice (checks everything works before the long run)
ON_KAGGLE = os.path.exists("/kaggle/working")
BATCH = os.environ.get("KAGGLE_KERNEL_RUN_TYPE", "") == "Batch"     # Kaggle "Save & Run All" / API push
# Private Kaggle dataset with hf_token.txt + favorite_world_voice_dataset.zip (pushed by kaggle_run.py)
INPUT_DIR = next((os.path.dirname(p) for p in glob.glob("/kaggle/input/**/hf_token.txt", recursive=True)), "")
if ON_KAGGLE:
    print("Kaggle inputs:", [p for p in glob.glob("/kaggle/input/**", recursive=True)][:20], "| INPUT_DIR =", INPUT_DIR)
if ON_KAGGLE:
    OUT_ROOT = "/kaggle/working/fw_claude_voice"
else:
    from google.colab import drive
    drive.mount("/content/drive")
    OUT_ROOT = "/content/drive/MyDrive/FavoriteWorld_Voice_Claude"   # Claude's own folder
WORK = "/tmp/fw_claude"                                              # fast local disk (clips, parquet)
PARLER_DIR = os.path.join(WORK, "parler-tts")
for d in (OUT_ROOT, WORK):
    os.makedirs(d, exist_ok=True)

HF_TOKEN = ""   # optional: paste hf_... here, or use Secrets named HF_TOKEN
if not HF_TOKEN and INPUT_DIR:
    HF_TOKEN = open(os.path.join(INPUT_DIR, "hf_token.txt"), encoding="utf-8").read().strip()
if not HF_TOKEN:
    try:
        if ON_KAGGLE:
            from kaggle_secrets import UserSecretsClient
            HF_TOKEN = UserSecretsClient().get_secret("HF_TOKEN")
        else:
            from google.colab import userdata
            HF_TOKEN = userdata.get("HF_TOKEN")
    except Exception:
        HF_TOKEN = ""
if not HF_TOKEN and BATCH:
    raise SystemExit("No Hugging Face token found (hf_token.txt input or HF_TOKEN secret).")
if not HF_TOKEN:
    HF_TOKEN = getpass.getpass("Paste your free Hugging Face READ token (hf_...): ").strip()
os.environ["HF_TOKEN"] = HF_TOKEN            # huggingface_hub / datasets read the token from here

!nvidia-smi -L
if not os.path.exists(PARLER_DIR):
    !git clone -q https://github.com/huggingface/parler-tts.git {PARLER_DIR}
!pip install -q -e "{PARLER_DIR}[train]" "datasets==3.6.0" soundfile librosa accelerate gradio gdown faster-whisper
# pip just swapped package versions: forget any copies Python loaded before the install (Kaggle preloads some)
for _m in [m for m in list(sys.modules) if m.split(".")[0] in ("huggingface_hub", "datasets", "transformers", "tokenizers", "accelerate", "fsspec")]:
    del sys.modules[_m]
import importlib; importlib.invalidate_caches()
import huggingface_hub, datasets
print("huggingface_hub", huggingface_hub.__version__, "| datasets", datasets.__version__)
print("OUT_ROOT =", OUT_ROOT, "| WORK =", WORK, "| Kaggle" if ON_KAGGLE else "| Colab", "| SMOKE TEST" if SMOKE else "")'''

CELL_NUMBERS_HEAD = "%%writefile fw_numbers.py\n"

CELL_COLLECT = r'''# CELL 3 - Collect training clips (resumable; skipped automatically once training data is prepared)
import os, sys, json, re, random, zipfile, glob
import numpy as np, soundfile as sf, librosa
from datasets import load_dataset, get_dataset_split_names
sys.path.insert(0, os.getcwd())
import fw_numbers as fwn

CACHE_DIR = os.path.join(OUT_ROOT, "parler_cache")          # precomputed audio codes (kept on Drive)
ALREADY_PREPARED = os.path.isdir(CACHE_DIR) and len(os.listdir(CACHE_DIR)) > 0
SR = 24000
CLIPS = os.path.join(WORK, "clips")
os.makedirs(CLIPS, exist_ok=True)
random.seed(42)

# ---- what to use (quota = clips kept; num_quota = how many of them must contain numbers) ----
SOURCES = [
    dict(name="indicvoices_r_hi", repo="ai4bharat/indicvoices_r", config="Hindi", split="train",
         quota=2600, num_quota=1100, lang="hi", style="natural, conversational", on=True),
    dict(name="rasa_hi", repo="ai4bharat/Rasa", config="Hindi", split="train",
         quota=700, num_quota=150, lang="hi", style="expressive", on=True),
    dict(name="fleurs_hi", repo="google/fleurs", config="hi_in", split="train",
         quota=450, num_quota=250, lang="hi", style="clear, read", on=True),
    # Svarah writes English numbers as digits ("11th to 14th century"); read aloud, so fw_numbers turns them into words
    dict(name="svarah_en", repo="ai4bharat/Svarah", config=None, split="test",
         quota=700, num_quota=300, lang="en", style="natural", on=True, allow_digits=True),
    # Studio-quality, but under IIT Madras's own Indic TTS licence - read it before turning these on:
    # https://www.iitm.ac.in/donlab/indictts/downloads/license.pdf
    dict(name="indictts_hi", repo="SPRINGLab/IndicTTS-Hindi", config=None, split="train",
         quota=800, num_quota=400, lang="hi", style="clear, studio-quality", on=False),
    dict(name="indictts_en", repo="SPRINGLab/IndicTTS-English", config=None, split="train",
         quota=600, num_quota=300, lang="en", style="clear, studio-quality", on=False),
]
MAX_SCAN = 60000            # rows looked at per source at most
if SMOKE:
    for s in SOURCES:
        s["quota"], s["num_quota"] = 12, 6
    MAX_SCAN = 1500
FW_ZIP_ID = "1URMspb8xOzQ834LYQ9x5EHmqMMRzC8zs"   # Antigravity's shared favorite_world_voice_dataset.zip (read only)
TEXT_KEYS = ("text", "normalized_text", "transcript", "transcription", "raw_transcription", "sentence", "verbatim")


def pick_text(ex):
    for k in TEXT_KEYS:
        v = ex.get(k)
        if isinstance(v, str) and v.strip():
            return v.strip()
    return ""


def pick_gender(ex):
    g = ex.get("gender")
    if isinstance(g, str):
        g = g.lower()
        return "female" if g.startswith("f") else "male" if g.startswith("m") else ""
    if isinstance(g, (int, np.integer)):
        return {0: "male", 1: "female"}.get(int(g), "")   # FLEURS: 0 male, 1 female
    return ""


def pace_word(text, dur):
    wps = len(text.split()) / max(dur, 0.1)
    return "slow" if wps < 1.9 else "fast" if wps > 3.3 else "moderate"


def describe(src, ex, text, dur):
    gender = pick_gender(ex)
    who = f"A {gender} speaker" if gender else "A speaker"
    style = src["style"]
    emo = ex.get("style") or ex.get("emotion")
    if src["name"].startswith("rasa") and isinstance(emo, str) and emo.strip():
        e = emo.strip().upper()
        # Rasa styles: emotions (HAPPY, SAD, ANGER, FEAR, SURPRISE, DISGUST...) + BOOK / INDIC / WIKI / PROPER NOUN / NAMES
        plain = {"BOOK": "storytelling", "INDIC": "narrative", "WIKI": "informative", "PROPER NOUN": "clear",
                 "NAMES": "clear", "CONVERSATION": "conversational", "NEUTRAL": "neutral"}
        style = plain.get(e, e.lower().replace("_", " ") + ", expressive")
    lang = "Hindi" if src["lang"] == "hi" else "English with an Indian accent"
    return (f"{who} delivers {style} {lang} speech at a {pace_word(text, dur)} pace, "
            f"with very clear audio and almost no background noise.")


def clean_audio(arr, sr):
    arr = np.asarray(arr, dtype=np.float32)
    if arr.ndim > 1:
        arr = arr.mean(axis=1)
    if sr != SR:
        arr = librosa.resample(arr, orig_sr=sr, target_sr=SR)
    arr, _ = librosa.effects.trim(arr, top_db=35)
    peak = float(np.max(np.abs(arr))) if arr.size else 0.0
    if peak < 1e-3:
        return None
    return (arr / peak * 0.95).astype(np.float32)


def text_ok(text, lang, allow_digits=False):
    if not text or len(text) < 4 or len(text) > 320:
        return False
    if re.search(r"[0-9०-९]", text) and not allow_digits:   # Hindi digits: we can't be sure how they were spoken - skip
        return False
    if re.search(r"[\[\]<>{}#*_=@]", text):    # noise tags / markup
        return False
    if lang == "hi" and not re.search(r"[ऀ-ॿ]", text):
        return False
    return True


def collect(src):
    out_dir = os.path.join(CLIPS, src["name"])
    done = os.path.join(out_dir, "DONE")
    if os.path.exists(done):
        n = sum(1 for _ in open(os.path.join(out_dir, "meta.jsonl"), encoding="utf-8"))
        print(f"[{src['name']}] already collected: {n} clips")
        return
    os.makedirs(out_dir, exist_ok=True)
    split = src["split"]
    try:
        names = get_dataset_split_names(src["repo"], src["config"], token=HF_TOKEN, trust_remote_code=True)
        if split not in names:
            split = "train" if "train" in names else names[0]
    except Exception as e:
        print(f"[{src['name']}] could not list splits ({e}); trying '{split}'")
    try:
        ds = load_dataset(src["repo"], src["config"], split=split, streaming=True, token=HF_TOKEN,
                          trust_remote_code=True)
        ds = ds.shuffle(seed=42, buffer_size=1500)
    except Exception as e:
        print(f"!! [{src['name']}] NOT AVAILABLE: {e}\n   -> open https://huggingface.co/datasets/{src['repo']} "
              f"and click 'Agree and access', then run this cell again.")
        return
    num_rows, other_rows, scanned = [], [], 0
    need_other = src["quota"] - src["num_quota"]
    meta = open(os.path.join(out_dir, "meta.jsonl"), "w", encoding="utf-8")
    for ex in ds:
        scanned += 1
        if scanned > MAX_SCAN or (len(num_rows) >= src["num_quota"] and len(other_rows) >= need_other):
            break
        text = re.sub(r"\s+", " ", pick_text(ex))
        if not text_ok(text, src["lang"], src.get("allow_digits", False)):
            continue
        is_num = fwn.has_number(text)
        if is_num and len(num_rows) < src["num_quota"]:
            bucket = num_rows
        elif len(other_rows) < need_other:
            bucket = other_rows
        else:
            continue
        snr = ex.get("snr")
        if isinstance(snr, (int, float)) and snr < 15:
            continue
        a = ex.get("audio") or next((v for v in ex.values() if isinstance(v, dict) and "array" in v), {})  # Svarah: audio_filepath
        try:
            arr, sr = a["array"], a["sampling_rate"]
        except Exception:
            continue
        dur_raw = len(arr) / float(sr)
        if not (1.5 <= dur_raw <= 15.0):
            continue
        arr = clean_audio(arr, sr)
        if arr is None:
            continue
        dur = len(arr) / SR
        if dur < 1.2:
            continue
        idx = len(num_rows) + len(other_rows)
        fn = f"{src['name']}_{idx:05d}.wav"
        sf.write(os.path.join(out_dir, fn), arr, SR, subtype="PCM_16")
        row = {"file": os.path.join(out_dir, fn), "transcription": fwn.normalize(text, lang=src["lang"], six_english=False),
               "text_description": describe(src, ex, text, dur), "duration": round(dur, 2),
               "source": src["name"], "has_number": is_num}
        meta.write(json.dumps(row, ensure_ascii=False) + "\n")
        bucket.append(row)
        if idx % 200 == 0:
            meta.flush()
            print(f"[{src['name']}] {idx} clips (numbers {len(num_rows)}) after {scanned} rows")
    meta.close()
    open(done, "w").write(f"{len(num_rows) + len(other_rows)} clips, {scanned} scanned\n")
    print(f"[{src['name']}] DONE: {len(num_rows)} number clips + {len(other_rows)} others (scanned {scanned})")


def collect_fw():
    out_dir = os.path.join(CLIPS, "favorite_world")
    if os.path.exists(os.path.join(out_dir, "DONE")):
        print("[favorite_world] already collected")
        return
    os.makedirs(out_dir, exist_ok=True)
    zip_path = os.path.join(WORK, "favorite_world_voice_dataset.zip")
    import shutil
    for cand in (os.path.join(INPUT_DIR, "favorite_world_voice_dataset.zip") if INPUT_DIR else "",
                 "/content/drive/MyDrive/FavoriteWorld_Voice_Model/favorite_world_voice_dataset.zip"):
        if cand and not os.path.exists(zip_path) and os.path.exists(cand):
            shutil.copy(cand, zip_path)               # read-only copy of the channel zip
    # Kaggle may unpack an uploaded zip into a folder: use that folder if there is no zip
    unpacked = ""
    if INPUT_DIR and not os.path.exists(zip_path):
        hits = sorted(glob.glob(os.path.join(INPUT_DIR, "**", "metadata.jsonl"), recursive=True))
        unpacked = os.path.dirname(hits[0]) if hits else ""
    if unpacked:
        shutil.copytree(unpacked, out_dir, dirs_exist_ok=True)
    else:
        if not os.path.exists(zip_path):
            subprocess.run(["gdown", "--fuzzy", f"https://drive.google.com/file/d/{FW_ZIP_ID}/view", "-O", zip_path])
        if not os.path.exists(zip_path):
            raise SystemExit("Upload favorite_world_voice_dataset.zip (clausd/out/) next to this notebook and run again.")
        with zipfile.ZipFile(zip_path) as zf:
            zf.extractall(out_dir)
    rows = []
    with open(os.path.join(out_dir, "metadata.jsonl"), encoding="utf-8") as f:
        for line in f:
            it = json.loads(line)
            if it.get("speaker", "FavoriteWorld") != "FavoriteWorld":
                continue
            text = it["transcription"].replace("|", ",").strip()
            if re.search(r"[0-9०-९]", text):
                text = fwn.normalize(text, six_english=False)
            rows.append({"file": os.path.join(out_dir, it["file_name"]), "transcription": text,
                         "text_description": it["text_description"], "duration": it.get("duration", 0),
                         "source": "favorite_world", "has_number": fwn.has_number(text)})
    if SMOKE:
        rows = rows[:24]
    with open(os.path.join(out_dir, "meta.jsonl"), "w", encoding="utf-8") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    open(os.path.join(out_dir, "DONE"), "w").write(f"{len(rows)} clips\n")
    print(f"[favorite_world] {len(rows)} channel clips")


if ALREADY_PREPARED:
    print("Training data was already prepared (parler_cache on Drive) - skip to Cell 5.")
else:
    collect_fw()
    for src in SOURCES:
        if src["on"]:
            collect(src)'''

CELL_PARQUET = r'''# CELL 4 - Mix everything into the training set (parquet shards)
import os, json, random, glob
import soundfile as sf
from datasets import Dataset, Audio

DATA_DIR = os.path.join(WORK, "dataset")
FW_REPEAT = 3          # channel clips are seen 3x so the voice stays yours
VAL_SIZE = 8 if SMOKE else 60
if ALREADY_PREPARED:
    print("Already prepared - skip to Cell 5.")
else:
    rows = {}
    for meta in glob.glob(os.path.join(CLIPS, "*", "meta.jsonl")):
        name = os.path.basename(os.path.dirname(meta))
        rows[name] = [json.loads(l) for l in open(meta, encoding="utf-8")]
        for r in rows[name]:          # FW durations may be missing in the zip metadata
            if not r.get("duration"):
                try:
                    r["duration"] = round(sf.info(r["file"]).duration, 2)
                except Exception:
                    r["duration"] = 0.0
    random.seed(42)
    every = [r for rs in rows.values() for r in rs]
    random.shuffle(every)
    val = every[:VAL_SIZE]
    val_files = {r["file"] for r in val}
    train = []
    for name, rs in rows.items():
        keep = [r for r in rs if r["file"] not in val_files]
        train += keep * (FW_REPEAT if name == "favorite_world" else 1)
    random.shuffle(train)

    print(f"{'source':<20}{'clips':>7}{'hours':>8}{'numbers':>9}")
    for name, rs in sorted(rows.items()):
        print(f"{name:<20}{len(rs):>7}{sum(r['duration'] for r in rs)/3600:>8.2f}{sum(r['has_number'] for r in rs):>9}")
    print(f"train rows (with channel x{FW_REPEAT}): {len(train)} | validation: {len(val)}")

    def to_rows(rs):
        return [{"audio": {"bytes": open(r["file"], "rb").read(), "path": os.path.basename(r["file"])},
                 "transcription": r["transcription"], "text_description": r["text_description"]} for r in rs]

    import shutil
    shutil.rmtree(DATA_DIR, ignore_errors=True)
    os.makedirs(DATA_DIR)
    SHARD = 500
    n_shards = (len(train) + SHARD - 1) // SHARD
    for i in range(n_shards):
        part = Dataset.from_list(to_rows(train[i * SHARD:(i + 1) * SHARD])).cast_column("audio", Audio())
        part.to_parquet(os.path.join(DATA_DIR, f"train-{i:05d}-of-{n_shards:05d}.parquet"))
    Dataset.from_list(to_rows(val)).cast_column("audio", Audio()).to_parquet(
        os.path.join(DATA_DIR, "validation-00000-of-00001.parquet"))
    json.dump({"train": len(train), "validation": len(val), "sources": {k: len(v) for k, v in rows.items()}},
              open(os.path.join(OUT_ROOT, "dataset_summary.json"), "w"), indent=2)
    print("Saved", n_shards, "train shards + validation to", DATA_DIR)'''

CELL_TRAIN = r'''# CELL 5 - Fine-tune ai4bharat/indic-parler-tts (resumes by itself after a disconnect)
import os
EPOCHS = 3
MODEL_OUT = os.path.join(OUT_ROOT, "model")            # checkpoints + final model
CACHE_DIR = os.path.join(OUT_ROOT, "parler_cache")      # audio codes, reused on resume
CODEC_TMP = os.path.join(OUT_ROOT, "parler_codec_tmp")  # audio-encoding progress, reused on resume
DATA_DIR = os.path.join(WORK, "dataset")
for d in (MODEL_OUT, CACHE_DIR, CODEC_TMP):
    os.makedirs(d, exist_ok=True)
if not os.listdir(CACHE_DIR) and not os.path.isdir(DATA_DIR):
    raise SystemExit("No training data yet - run Cells 3 and 4 first.")

# Same T4 patches Antigravity verified live (Adafactor fits the 0.9B model in 15 GB), applied to Claude's own copy.
dp = os.path.join(PARLER_DIR, "training/data.py")
ds = open(dp, encoding="utf-8").read()
ds = ds.replace('metadata_dataset_names = metadata_dataset_names.split("+") if metadata_dataset_names is not None else None',
                'metadata_dataset_names = metadata_dataset_names.split("+") if metadata_dataset_names is not None else [None] * len(dataset_names)')
open(dp, "w", encoding="utf-8").write(ds)
tp = os.path.join(PARLER_DIR, "training/run_parler_tts_training.py")
ts = open(tp, encoding="utf-8").read()
ts = ts.replace("if bandwidth is not None:", 'if "bandwidth" in encoder_signature and bandwidth is not None:')
ts = ts.replace("del generate_labels, all_lens", "pass")
ts = ts.replace('len(vectorized_datasets["eval"]) - 1', 'len(vectorized_datasets["train"]) - 1')
ts = ts.replace("optimizer = torch.optim.AdamW(", "optimizer = transformers.Adafactor(")
ts = ts.replace("betas=(training_args.adam_beta1, training_args.adam_beta2),", "scale_parameter=False, relative_step=False, warmup_init=False,")
ts = ts.replace("eps=training_args.adam_epsilon,", "")
open(tp, "w", encoding="utf-8").write(ts)

ckpts = sorted(d for d in os.listdir(MODEL_OUT) if d.startswith("checkpoint-"))
print("Resuming from", ckpts[-1] if ckpts else "the start", "| log:", os.path.join(OUT_ROOT, "train.log"))
EXTRA = "--max_steps 12" if SMOKE else ""
SAVE_STEPS = 6 if SMOKE else 150

# one GPU process (Kaggle has 2 T4s; accelerate would otherwise start multi-GPU, which this patched script isn't tested with)
!USE_TF=0 PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True accelerate launch --num_processes 1 {tp} \
  --model_name_or_path "ai4bharat/indic-parler-tts" \
  --feature_extractor_name "ai4bharat/indic-parler-tts" \
  --description_tokenizer_name "ai4bharat/indic-parler-tts" \
  --prompt_tokenizer_name "ai4bharat/indic-parler-tts" \
  --train_dataset_name "{DATA_DIR}" --train_dataset_config_name "default" --train_split_name "train" \
  --eval_dataset_name "{DATA_DIR}" --eval_dataset_config_name "default" --eval_split_name "validation" \
  --target_audio_column_name "audio" --description_column_name "text_description" --prompt_column_name "transcription" \
  --min_duration_in_seconds 1.2 --max_duration_in_seconds 15 \
  --save_to_disk "{CACHE_DIR}" --temporary_save_to_disk "{CODEC_TMP}" --output_dir "{MODEL_OUT}" \
  --do_train --fp16 --per_device_train_batch_size 1 --gradient_accumulation_steps 8 --gradient_checkpointing \
  --learning_rate 1.5e-5 --num_train_epochs {EPOCHS} --warmup_steps 80 --seed 42 \
  --logging_steps 10 --save_steps {SAVE_STEPS} --save_total_limit 1 --report_to "none" --preprocessing_num_workers 2 \
  {EXTRA} 2>&1 | tee -a "{OUT_ROOT}/train.log"

FINAL_OK = os.path.exists(os.path.join(MODEL_OUT, "config.json"))
print("Final model ready:", FINAL_OK)
if not FINAL_OK:
    raise SystemExit("Training did not finish - see train.log (last lines above).")'''

# The voice test, the sample and the server load the model in a FRESH Python (like training does), so nothing
# the notebook imported before pip changed versions (TensorFlow, protobuf, huggingface_hub...) can get in the way.
VOICE_MODULE = r'''"""fw_voice.py - load the trained voice and speak (written by the notebook)."""
import os, sys, re, json, glob, gc
os.environ.setdefault("USE_TF", "0")
os.environ.setdefault("TRANSFORMERS_NO_TF", "1")
import numpy as np, torch, soundfile as sf
OUT_ROOT = os.environ["FW_OUT_ROOT"]
PARLER_DIR = os.environ["FW_PARLER_DIR"]
SMOKE = os.environ.get("FW_SMOKE") == "1"
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, PARLER_DIR)
import fw_numbers as fwn
from parler_tts import ParlerTTSForConditionalGeneration
from transformers import AutoTokenizer

MODEL_OUT = os.path.join(OUT_ROOT, "model")
FW_DESC = ("FavoriteWorld speaks clearly in a warm, expressive, studio-quality Hindi documentary "
           "narrator voice with natural pacing and no background noise.")
DEVICE = "cuda:0" if torch.cuda.is_available() else "cpu"


def load_voice(which="trained"):
    """trained = final model, or the latest checkpoint if training stopped early; base = original indic-parler-tts."""
    base = "ai4bharat/indic-parler-tts"
    if which == "trained" and os.path.exists(os.path.join(MODEL_OUT, "config.json")):
        model = ParlerTTSForConditionalGeneration.from_pretrained(MODEL_OUT)
        tok_dir = MODEL_OUT
    else:
        model = ParlerTTSForConditionalGeneration.from_pretrained(base)
        tok_dir = base
        if which == "trained":
            ck = sorted(glob.glob(os.path.join(MODEL_OUT, "checkpoint-*")), key=lambda p: int(re.findall(r"checkpoint-(\d+)", p)[0]))
            if not ck:
                raise SystemExit("No trained model or checkpoint yet.")
            wf = next((p for p in (os.path.join(ck[-1], n) for n in ("pytorch_model.bin", "model.safetensors")) if os.path.exists(p)), None)
            if wf.endswith(".bin"):
                sd = torch.load(wf, map_location="cpu")
            else:
                from safetensors.torch import load_file
                sd = load_file(wf)
            print("Loaded checkpoint", ck[-1], model.load_state_dict(sd, strict=False))
    model = model.to(DEVICE).eval()
    if DEVICE.startswith("cuda"):
        model = model.half()
    tok = AutoTokenizer.from_pretrained(tok_dir)
    desc_tok = AutoTokenizer.from_pretrained(model.config.text_encoder._name_or_path)
    return model, tok, desc_tok


def chunks(text, limit=180):
    parts = re.split(r"(?<=[।.!?])\s+", text.strip())
    out = []
    for p in parts:
        while len(p) > limit:
            cut = p.rfind(",", 0, limit)
            cut = cut if cut > 40 else limit
            out.append(p[:cut + 1].strip())
            p = p[cut + 1:].strip()
        if p:
            out.append(p)
    return out


def speak(voice, text, desc=FW_DESC, normalize=True):
    model, tok, desc_tok = voice
    spoken = fwn.normalize(text) if normalize else text
    sr = model.config.sampling_rate
    pieces = []
    d = desc_tok(desc, return_tensors="pt").to(DEVICE)
    for c in chunks(spoken):
        p = tok(c, return_tensors="pt").to(DEVICE)
        with torch.no_grad():
            g = model.generate(input_ids=d.input_ids, attention_mask=d.attention_mask,
                               prompt_input_ids=p.input_ids, prompt_attention_mask=p.attention_mask)
        pieces += [g.float().cpu().numpy().squeeze(), np.zeros(int(sr * 0.12), dtype=np.float32)]
    return (np.concatenate(pieces) if pieces else np.zeros(1, dtype=np.float32)), sr, spoken
'''

EVAL_SCRIPT = r'''"""fw_eval.py - number test: base model vs trained model, scored by Whisper (also saves WAVs to listen)."""
from fw_voice import *
TESTS = [
    ("hi", "सन 1947 में भारत आज़ाद हुआ, और 1950 में संविधान लागू हुआ।"),
    ("hi", "इस प्रोजेक्ट पर ₹2.5 लाख करोड़ खर्च हुए।"),
    ("hi", "देश की 56.4% आबादी गाँवों में रहती है।"),
    ("hi", "1971 की जंग में 93,000 सैनिकों ने हथियार डाल दिए।"),
    ("hi", "ये ट्रेन 160 km/h की रफ़्तार से चलती है।"),
    ("hi", "2023-24 में GDP 8.2% की दर से बढ़ी।"),
    ("hi", "रात 10:30 बजे 6 लोग वहाँ पहुँचे।"),
    ("hi", "इवान III ने 1480 में मंगोलों को रोक दिया।"),
    ("hi", "COVID-19 के बाद 3 करोड़ लोगों की नौकरी गई।"),
    ("hi", "चंद्रयान-3 ने 23 अगस्त 2023 को चाँद पर लैंड किया।"),
    ("hi", "सिर्फ़ 20-25 मिनट में 500+ लोग जमा हो गए।"),
    ("hi", "15/08/1947 की आधी रात को तिरंगा फहराया गया।"),
    ("hi", "उसकी उम्र सिर्फ़ 21 साल थी, और उसके पास ₹1 लाख 20 हज़ार थे।"),
    ("hi", "भारत के पास लगभग 4,000 टैंक और 600 लड़ाकू विमान हैं।"),
    ("en", "In 1947, nearly 15 million people crossed the new border."),
    ("en", "The project cost $1.2 billion and took 7 years."),
    ("en", "Inflation fell to 4.5% in 2024."),
    ("en", "On August 15, 1947, India became free."),
    ("hi", "ये secret mission 1962 में शुरू हुआ, और 3 officers को पता था।"),
    ("hi", "1990s में Mumbai पर 26/11 जैसा हमला कोई सोच भी नहीं सकता था।"),
]
NUM_VOCAB = set(fwn.HI_0_99) | set(fwn.EN_0_19) | set(fwn.EN_TENS[2:]) | {
    "सौ", "हज़ार", "लाख", "करोड़", "दशमलव", "प्रतिशत", "डेढ़", "ढाई", "साढ़े", "सवा", "पौने", "six",
    "hundred", "thousand", "million", "billion", "point", "percent", "first", "fifteenth", "third"}


def words(t):
    t = fwn.normalize(t)                      # Whisper may write digits - turn them into words too
    t = re.sub(r"[^\wऀ-ॿ\s-]", " ", t.lower()).replace("-", " ")
    return t.split()


def num_score(ref, hyp):
    r = [w for w in words(ref) if w in NUM_VOCAB]
    h = words(hyp)
    hit = sum(min(r.count(w), h.count(w)) for w in set(r))
    return hit, len(r)


def cer(ref, hyp):
    a, b = "".join(words(ref)), "".join(words(hyp))
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1] / max(len(a), 1)


if SMOKE:
    TESTS = TESTS[:3]
from faster_whisper import WhisperModel
import librosa


def load16k(path):
    """Give Whisper raw 16 kHz audio (its own file reader breaks on Kaggle's PyAV version)."""
    a, sr0 = sf.read(path, dtype="float32")
    if a.ndim > 1:
        a = a.mean(axis=1)
    return librosa.resample(a, orig_sr=sr0, target_sr=16000).astype(np.float32)


EVAL = os.path.join(OUT_ROOT, "eval")
report = {}
for which in ("base", "trained"):
    voice = load_voice(which)
    os.makedirs(os.path.join(EVAL, which), exist_ok=True)
    for i, (lang, text) in enumerate(TESTS, 1):
        wav, sr, spoken = speak(voice, text)
        sf.write(os.path.join(EVAL, which, f"{i:02d}.wav"), wav, sr)
    del voice; gc.collect(); torch.cuda.empty_cache()
try:
    asr = WhisperModel("large-v3", device="cuda", compute_type="float16")
    list(asr.transcribe(load16k(os.path.join(EVAL, "base", "01.wav")), language="hi")[0])   # force CUDA libs to load now
except Exception as e:
    print("Whisper on GPU failed (", e, ") - using CPU, slower but fine for 20 short clips")
    asr = WhisperModel("large-v3", device="cpu", compute_type="int8")
for which in ("base", "trained"):
    rows, hits, total, cers = [], 0, 0, []
    for i, (lang, text) in enumerate(TESTS, 1):
        segs, _ = asr.transcribe(load16k(os.path.join(EVAL, which, f"{i:02d}.wav")), language=lang, beam_size=5)
        hyp = " ".join(s.text for s in segs).strip()
        h, t = num_score(text, hyp)
        c = cer(fwn.normalize(text), hyp)
        hits += h; total += t; cers.append(c)
        rows.append({"n": i, "text": text, "spoken": fwn.normalize(text), "heard": hyp, "numbers": f"{h}/{t}", "cer": round(c, 3)})
    report[which] = {"number_words_right": f"{hits}/{total}", "number_accuracy": round(hits / max(total, 1), 3),
                     "mean_cer": round(float(np.mean(cers)), 3), "rows": rows}
    print(f"\n{which.upper()}: number words read right {hits}/{total} ({hits / max(total, 1):.0%}), mean CER {np.mean(cers):.3f}")
    for r in rows:
        print(f"  {r['n']:02d} [{r['numbers']}] {r['heard']}")
json.dump(report, open(os.path.join(EVAL, "report.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print("\nSaved WAVs + report to", EVAL, "- listen to eval/trained/*.wav before using the voice.")'''

SAMPLE_SCRIPT = r'''"""fw_sample.py - the user's 10-20 second sample voiceover with the trained voice."""
from fw_voice import *
SAMPLES = {
    "fw_sample_hindi_numbers": ("सन 1971 की सर्दियों में, ढाका में 93,000 पाकिस्तानी सैनिकों ने हथियार डाल दिए। "
                                "सिर्फ़ 13 दिन की जंग ने, एशिया का नक्शा बदल दिया। "
                                "और इस कहानी का, सबसे बड़ा twist अभी बाकी था।"),
}
SAMPLE_DIR = os.path.join(OUT_ROOT, "sample")
os.makedirs(SAMPLE_DIR, exist_ok=True)
voice = load_voice("trained")
for name, text in SAMPLES.items():
    wav, sr, spoken = speak(voice, text)
    path = os.path.join(SAMPLE_DIR, name + ".wav")
    sf.write(path, wav, sr)
    print(f"{name}: {len(wav) / sr:.1f} s -> {path}\n  spoken as: {spoken}")
'''

RUN_ENV = 'USE_TF=0 TRANSFORMERS_NO_TF=1 FW_OUT_ROOT="{OUT_ROOT}" FW_PARLER_DIR="{PARLER_DIR}" FW_SMOKE={SMOKE_FLAG}'

CELL_HELPERS = ("# CELL 6 - Write the voice scripts (fw_voice.py, fw_eval.py, fw_sample.py). They run as fresh programs.\n"
                "import os\n"
                "SMOKE_FLAG = '1' if SMOKE else '0'\n"
                f"open('fw_voice.py', 'w', encoding='utf-8').write({VOICE_MODULE!r})\n"
                f"open('fw_eval.py', 'w', encoding='utf-8').write({EVAL_SCRIPT!r})\n"
                f"open('fw_sample.py', 'w', encoding='utf-8').write({SAMPLE_SCRIPT!r})\n"
                "print('voice scripts written:', os.getcwd())")

CELL_EVAL = ("# CELL 7 - Number test: base model vs your trained model, scored by Whisper (WAVs saved to listen)\n"
             f"!{RUN_ENV} python fw_eval.py 2>&1 | tee -a \"{{OUT_ROOT}}/eval.log\"\n"
             "print('report:', os.path.exists(os.path.join(OUT_ROOT, 'eval', 'report.json')))")

CELL_SAMPLE = ("# CELL 8 - Your 10-20 second sample voiceover (trained voice) -> OUT_ROOT/sample/\n"
               f"!{RUN_ENV} python fw_sample.py 2>&1 | tee -a \"{{OUT_ROOT}}/sample.log\"\n"
               "_s = os.path.join(OUT_ROOT, 'sample', 'fw_sample_hindi_numbers.wav')\n"
               "print('sample ready:', os.path.exists(_s))\n"
               "if os.path.exists(_s):\n"
               "    from IPython.display import Audio, display\n"
               "    display(Audio(_s))")

CELL_SERVE = r'''# CELL 9 - Voice server for Voiceover Studio Pro (gradio.live link). Any time later: run Cells 1, 2, 6, then this.
# Same endpoint name as Antigravity's server (generate_finetuned: text, description), so Voiceover Studio works as is.
# Numbers, dates, money and short forms are converted here (fw_numbers), so you can type digits.
def serve():
    os.environ.update(FW_OUT_ROOT=OUT_ROOT, FW_PARLER_DIR=PARLER_DIR, FW_SMOKE=SMOKE_FLAG)
    sys.path.insert(0, os.getcwd())
    import tempfile, gradio as gr
    from fw_voice import load_voice, speak, FW_DESC, sf
    voice = load_voice("trained")

    def generate_finetuned(text_input, description_input):
        desc = (description_input or "").strip() or FW_DESC
        wav, sr, spoken = speak(voice, text_input or "", desc=desc)
        out = tempfile.NamedTemporaryFile(suffix=".wav", delete=False).name
        sf.write(out, wav, sr)
        return out

    with gr.Blocks() as demo:
        gr.Markdown("# Favorite World voice (Claude training: Hindi + English + numbers)")
        txt = gr.Textbox(label="Text (digits are fine: 1947, ₹2.5 लाख, 56.4%)")
        desc = gr.Textbox(value=FW_DESC, label="Description")
        btn = gr.Button("Generate")
        out = gr.Audio(type="filepath", label="Voice")
        btn.click(generate_finetuned, [txt, desc], [out], api_name="generate_finetuned")
    demo.queue().launch(share=True, debug=True)


if BATCH:
    print("Unattended Kaggle run: voice server skipped (it would keep the GPU busy forever). All done.")
else:
    serve()'''


def code(src: str) -> dict:
    lines = src.splitlines(keepends=True)
    return {"cell_type": "code", "metadata": {}, "execution_count": None, "outputs": [], "source": lines}


def md(src: str) -> dict:
    return {"cell_type": "markdown", "metadata": {}, "source": src.splitlines(keepends=True)}


def main() -> None:
    build(OUT, smoke=False)
    build(OUT.with_name(OUT.stem + "_SMOKE.ipynb"), smoke=True)


def build(out: Path, smoke: bool) -> None:
    numbers_src = FW_NUMBERS.read_text(encoding="utf-8")
    setup = CELL_SETUP.replace("SMOKE = False ", "SMOKE = True  ") if smoke else CELL_SETUP
    assert ("SMOKE = True" in setup) == smoke
    cells = [
        md(MD_INTRO),
        code(setup),
        code(CELL_NUMBERS_HEAD + "# CELL 2 - number reader (copy of production/pipeline/fw_numbers.py; run it, it saves the file)\n"
             + numbers_src),
        code(CELL_COLLECT),
        code(CELL_PARQUET),
        code(CELL_TRAIN),
        code(CELL_HELPERS),
        code(CELL_EVAL),
        code(CELL_SAMPLE),
        code(CELL_SERVE),
    ]
    nb = {"cells": cells, "metadata": {"accelerator": "GPU", "colab": {"provenance": [], "gpuType": "T4"},
                                       "kernelspec": {"display_name": "Python 3", "name": "python3"},
                                       "language_info": {"name": "python"}},
          "nbformat": 4, "nbformat_minor": 5}
    out.write_text(json.dumps(nb, ensure_ascii=False, indent=1), encoding="utf-8")
    print("wrote", out, len(cells), "cells", "(smoke)" if smoke else "")


if __name__ == "__main__":
    main()
