#!/usr/bin/env bash
# Favorite World voice server - one venv per engine (they need different library versions).
# Venvs see the machine's own torch/numpy/gradio (--system-site-packages), so only the conflicting packages are
# installed. Venvs are made WITHOUT their own pip (Colab's and Kaggle's Python have no ensurepip - the first
# Kaggle test failed on that); the system pip installs into each venv by being run with the venv's python.
# Installs run side by side; each writes its own log; ".done" or ".failed" marks the result. Safe to run again.
VENVS=${FW_VENVS:-/content/fwvenvs}
LOGS=${FW_LOGS:-/content/fwlogs}
mkdir -p "$VENVS" "$LOGS"

mk() {  # name, pip args...
  local name=$1; shift
  if [ -f "$VENVS/$name/.done" ]; then echo "[$name] already installed"; return 0; fi
  rm -f "$VENVS/$name/.failed"
  python -m venv --without-pip --system-site-packages "$VENVS/$name" > "$LOGS/setup_$name.log" 2>&1
  if "$VENVS/$name/bin/python" -m pip install -q "$@" >> "$LOGS/setup_$name.log" 2>&1; then
    echo "[$name] installed"; return 0
  fi
  echo "[$name] INSTALL FAILED - tail of $LOGS/setup_$name.log:"; tail -n 15 "$LOGS/setup_$name.log"
  touch "$VENVS/$name/.failed"; return 1
}
done_ok() { touch "$VENVS/$1/.done"; }

mk_iso() {  # name, pip args... - fully separate venv (nothing shared with the machine), installed by the
  # system pip through `pip --python`. IndicF5 needs numpy 1.26 + transformers 4.49; mixed with the machine's
  # numpy-2 libraries, transformers crashed ("numpy.dtypes has no attribute StringDType", Kaggle CPU test).
  local name=$1; shift
  if [ -f "$VENVS/$name/.done" ]; then echo "[$name] already installed"; return 0; fi
  rm -rf "$VENVS/$name"
  python -m venv --without-pip "$VENVS/$name" > "$LOGS/setup_$name.log" 2>&1
  if python -m pip --python "$VENVS/$name/bin/python" install -q "$@" >> "$LOGS/setup_$name.log" 2>&1; then
    echo "[$name] installed"; return 0
  fi
  echo "[$name] INSTALL FAILED - tail of $LOGS/setup_$name.log:"; tail -n 15 "$LOGS/setup_$name.log"
  mkdir -p "$VENVS/$name"; touch "$VENVS/$name/.failed"; return 1
}

python -m pip install -q "gradio>=5" gradio_client requests "kaggle>=1.8" > "$LOGS/setup_front.log" 2>&1

( mk parler "git+https://github.com/huggingface/parler-tts.git" soundfile && done_ok parler ) &
( mk chatterbox --no-deps chatterbox-tts && \
  mk chatterbox resemble-perth conformer==0.3.2 s3tokenizer omegaconf pykakasi==2.3.0 pyloudnorm soundfile \
      librosa==0.11.0 && done_ok chatterbox ) &
( mk qwen -U qwen-tts soundfile && done_ok qwen ) &
( mk_iso indicf5 torch torchaudio "git+https://github.com/ai4bharat/IndicF5.git" "transformers==4.49.0" \
      faster-whisper soundfile librosa "gradio>=5" requests && done_ok indicf5 ) &
wait
echo "setup finished"
