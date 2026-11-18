# Voiceover Studio Pro (Port 7413)

**100% Cloud AI Text-to-Voiceover Generator for Hindi, English & Hinglish — zero AI models run on your computer.**

## Launch
- **PC:** Double-click `Start Voiceover Studio.cmd` (opens `http://localhost:7413`)
- **Phone (same Wi-Fi):** Double-click `Open On Phone.cmd` and open the printed LAN URL
- **CLI (`production/pipeline/voice_gen.py`):**
  ```powershell
  python production/pipeline/voice_gen.py --text "नमस्ते दोस्तों!" --lang hi --engine chatterbox --out test.wav
  python production/pipeline/voice_gen.py --lines sentences.json --out voiceover_tts/ --engine edge --voice hi-IN-MadhurNeural
  ```

## Free Cloud Engines Included
1. **Chatterbox AI Cloud** (`ResembleAI/Chatterbox-Multilingual-TTS` via Hugging Face ZeroGPU) — Cartesia-grade expressive Hindi & English + **zero-shot voice cloning** from any 5–20 s `.wav`/`.mp3` sample (including Cartesia Vishal's reference or your own voice).
2. **Edge Neural Cloud** (Microsoft Edge Neural TTS) — **100% free & unlimited**, instant, zero daily quota; includes Hindi (`hi-IN-MadhurNeural`, `hi-IN-SwaraNeural`), Indian English (`en-IN-PrabhatNeural`, `en-IN-NeerjaExpressiveNeural`), US/UK Documentary English, and **Hinglish Multilingual** (`en-US-AndrewMultilingualNeural`, `en-US-BrianMultilingualNeural`).
3. **AI4Bharat IndicF5** — Indian-accent Hindi & English zero-shot voice cloning on Hugging Face Cloud.
4. **Qwen3-TTS 1.7B** — Studio-grade English narration, custom speakers, and natural-language **Voice Design**.
5. **Unlimited Free Google Colab Mode** — Open `Voiceover_Cloud_Colab.ipynb` in Google Colab (Free T4 GPU) and paste the generated `https://xxxx.gradio.live` link into the Studio UI for unlimited Cartesia-quality voice cloning with zero daily ZeroGPU limit.
6. **Train Your Own Favorite World Voice (on ALL 6 channel episodes + 160 real Hindi speakers!)** — Run `python production/pipeline/prepare_voice_dataset.py` (packages `out/favorite_world_voice_dataset.zip` — 598 clean clips / 45.4 min), then open `Train_IndicParler_FavoriteWorld_Colab.ipynb` (recommended — fine-tunes AI4Bharat Indic-Parler-TTS + 160 real Hindi person clips from `google/fleurs`) or `Train_FavoriteWorld_Voice_Colab.ipynb` (XTTS-v2) on Google Colab's free T4 GPU. Both save permanently to Google Drive and launch a `gradio.live` link that plugs directly into Voiceover Studio Pro.
