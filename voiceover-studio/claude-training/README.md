# Claude's voice training: Hindi + English conversations + numbers (2026-11-16)

User: "train this model with freely available hundreds of hindi english conversations, also its not able to
read or generate voiceovers of numbers in hindi english so train it" + "after training must generate a 10-20
second voiceover and give it to me" + "antigravity is also training so dont clash between".

## What's here
| File | What it does |
|---|---|
| `Train_FW_Voice_Mix_Numbers.ipynb` | The cloud notebook (Colab T4 or Kaggle GPU). 9 cells: setup, number reader, collect clips, mix, train (resumable), helpers, number test (Whisper), **15-second sample**, voice server. |
| `build_notebook.py` | Rebuilds the notebook (embeds the latest `production/pipeline/fw_numbers.py`). Run it after changing `fw_numbers.py`. |
| `../../../production/pipeline/fw_numbers.py` | Number reader for Hindi + English: years, ₹/$, lakh/crore/million, %, decimals (डेढ़/ढाई/साढ़े), ranges, dates, times (साढ़े दस बजे), units, codes (B twelve, COVID nineteen, A three twenty), acronyms (I-C-M-R), kings (इवान third), "six" not छह. `--selftest` = 47 checks. |

## Training data (all free, read in the cloud, nothing downloaded to the PC)
| Source | Licence | Clips | Of them with numbers |
|---|---|---|---|
| Favorite World channel voice (Antigravity's zip, read only) | own | 598 × 3 | — |
| AI4Bharat IndicVoices-R Hindi (natural everyday speech, many speakers) | CC BY 4.0 | 2,600 | 1,100 |
| AI4Bharat Rasa Hindi (emotional speech) | CC BY 4.0 | 700 | 150 |
| Google FLEURS Hindi | CC BY 4.0 | 450 | 250 |
| AI4Bharat Svarah (Indian-accented English) | CC BY 4.0 | 700 | 300 |
| IIT Madras IndicTTS Hindi / English (studio) | own licence (PDF) | off by default | — |

Rows with digits in the transcript are skipped (we can't know how they were spoken); every transcript goes
through `fw_numbers.normalize(..., six_english=False)` so training text = what was said. Number-rich lines are
picked first. Clips 1.2–15 s, trimmed, peak-normalised, 24 kHz.

**Why numbers are fixed in two places:** a TTS model only ever learns spoken words, so digits must become
words before the model sees them. The voice server (Cell 9) runs `fw_numbers` on every request, so typing
"1947" or "₹2.5 लाख" works; the training adds hundreds of real number sentences so the model says those
words well.

## No clash with Antigravity
- Claude writes only to `MyDrive/FavoriteWorld_Voice_Claude/` (Kaggle: `/kaggle/working/fw_claude_voice/`).
  Antigravity's folder `MyDrive/FavoriteWorld_Voice_Model/` is only read (the channel zip).
- Claude's files: this folder + `production/pipeline/fw_numbers.py`. Claude does not edit `voice_gen.py`,
  `server.py`, `index.html`, Antigravity's notebooks, `fetch_hindi_conversations.py`, `out/fw_voice_dataset/`
  or `out/hindi_conversations_100/`.
- A free Colab account has one GPU at a time: run this on Kaggle, or after Antigravity's Colab run ends.
- Same server endpoint as Antigravity's (`generate_finetuned`: text, description), so the link from Cell 9
  pastes into Voiceover Studio Pro → Custom Colab / Gradio URL with no code change.
- For Antigravity: `voice_gen.py` can `from fw_numbers import normalize` to replace its own digit expander
  (it misses छह→six, 2023-24, ranges, ₹ with लाख/करोड़, codes, ordinals, dates, times). Not done by Claude
  to avoid editing a file Antigravity is working on.

## Kaggle route (used for the first run, user's choice 2026-11-16 - free, no clash with Antigravity's Colab)
- Kaggle account `alek6835210` (phone verified). Token = `KAGGLE_API_TOKEN` in the git-ignored `.env`.
- `kaggle_run.py inputs` → private dataset `fw-claude-voice-inputs` (HF read token + channel zip).
- `kaggle_run.py push smoke|full` → private notebooks `fw-voice-claude-smoke` / `fw-voice-claude-train`
  (`build_notebook.py` writes both; the SMOKE one = 12 steps on 106 rows, ~15 min).
- `kaggle_run.py status full`, `kaggle_run.py fetch full` (sample + eval + logs only, not the 3.6 GB model).
- Kaggle gotchas fixed in the notebook: inputs live under `/kaggle/input/datasets/<user>/<slug>/`; install
  packages before importing huggingface_hub; `USE_TF=0` (TensorFlow/protobuf clash); voice test, sample and
  server run as fresh Python programs (`fw_voice.py`, `fw_eval.py`, `fw_sample.py`); Whisper gets raw 16 kHz
  audio (its PyAV reader breaks); one GPU process (`--num_processes 1`).
- Smoke result (12 steps): base and trained both read 12/13 number words right once `fw_numbers` converts the
  digits, so the number fix is the converter; training is for voice quality.

## Steps
1. Sign in to Hugging Face and click "Agree and access" on: indic-parler-tts, indicvoices_r, Rasa, Svarah.
2. Open the notebook in Colab (or Kaggle), T4 GPU, add `HF_TOKEN` secret, run Cells 1→8.
3. Cell 7 prints "number words read right" for the base model vs the trained one; WAVs in `eval/`.
4. Cell 8 writes the 10–20 s sample to `FavoriteWorld_Voice_Claude/sample/` - it goes to the user.
5. Cell 9 gives the gradio.live link for Voiceover Studio Pro.
