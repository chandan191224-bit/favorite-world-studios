"""Publish the all-engines Colab voice server code to the private Kaggle dataset `<user>/fw-colab-voice-server`.

Voice_Server_Colab_Free.ipynb downloads this dataset every time it starts, so server fixes reach Colab without
re-uploading the notebook. Run after changing anything in colab_server/ or production/pipeline/fw_numbers.py:

  python studios/voiceover-studio/claude-training/publish_colab_server.py
"""
from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
sys.path.insert(0, str(HERE))
import kaggle_run as K  # noqa: E402

SLUG = "fw-colab-voice-server"


def main() -> None:
    user = K.username()
    stage = ROOT / "out" / "claude_voice_kaggle" / "colab_server_dataset"
    if stage.exists():
        shutil.rmtree(stage)
    stage.mkdir(parents=True)
    for p in (HERE / "colab_server").iterdir():
        if p.suffix in (".py", ".sh"):
            shutil.copy2(p, stage / p.name)
    shutil.copy2(ROOT / "production" / "pipeline" / "fw_numbers.py", stage / "fw_numbers.py")
    shutil.copy2(ROOT / "production" / "pipeline" / "voice_gen.py", stage / "voice_gen.py")   # used by the Kaggle engine test
    (stage / "dataset-metadata.json").write_text(json.dumps(
        {"title": SLUG, "id": f"{user}/{SLUG}", "licenses": [{"name": "other"}]}, indent=1), encoding="utf-8")
    exists = K.kaggle("datasets", "files", f"{user}/{SLUG}", check=False, capture=True).returncode == 0
    if exists:
        K.kaggle("datasets", "version", "-p", str(stage), "-m", "update voice server", "-q", capture=True)
    else:
        K.kaggle("datasets", "create", "-p", str(stage), "-q", capture=True)      # private by default
    print(f"published {user}/{SLUG}:", sorted(p.name for p in stage.iterdir() if p.name != "dataset-metadata.json"))


if __name__ == "__main__":
    main()
