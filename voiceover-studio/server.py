"""Voiceover Studio Pro — Lightweight Cloud-Bridge Server (Port 7413).

Runs ZERO AI models on your computer. Serves the dark + amber Studio UI and
forwards synthesis requests to free cloud TTS servers (Chatterbox AI Cloud,
AI4Bharat IndicF5, Qwen3-TTS, Microsoft Edge Neural Cloud, or a Google Colab link).

Usage:
  python studios/voiceover-studio/server.py          # http://127.0.0.1:7413
  python studios/voiceover-studio/server.py --lan    # http://<lan-ip>:7413 (phone)
"""
from __future__ import annotations

import argparse
import base64
import datetime as dt
import io
import json
import mimetypes
import os
import re
import socket
import sys
import uuid
import webbrowser
import zipfile
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import quote as urllib_quote, unquote, urlparse

STUDIO_DIR = Path(__file__).resolve().parent
ROOT = STUDIO_DIR.parents[1]
PIPELINE_DIR = ROOT / "production" / "pipeline"
if str(PIPELINE_DIR) not in sys.path:
    sys.path.insert(0, str(PIPELINE_DIR))

import subprocess
import tempfile
import wave

import voice_gen  # noqa: E402

REFS_DIR = STUDIO_DIR / "refs"
VOICES_DIR = STUDIO_DIR / "voices"
VOICES_JSON = VOICES_DIR / "voices.json"
OUTPUTS_DIR = STUDIO_DIR / "outputs"
REFS_DIR.mkdir(parents=True, exist_ok=True)
VOICES_DIR.mkdir(parents=True, exist_ok=True)
OUTPUTS_DIR.mkdir(parents=True, exist_ok=True)


# ---- Kaggle GPU voiceover jobs (Claude, 2026-11-16; user: "kaggal is good ... or both if free") -------------
# A whole script goes to Kaggle's free T4 as one job (production/pipeline/kaggle_voice.py); the WAVs come back
# mastered as OUTPUTS_DIR/<job_id>/1.wav, 2.wav ... One job at a time.
import threading  # noqa: E402

# The free Colab voice-server link is kept on the server (not per browser), so every browser and the phone use it.
# User: "why it writes ... Edge Madhur (fallback ...)" - their own browser had no Colab link saved.
COLAB_URL_FILE = VOICES_DIR / "colab_url.json"


def _saved_colab_url() -> str:
    try:
        return str(json.loads(COLAB_URL_FILE.read_text(encoding="utf-8")).get("url") or "").strip()
    except Exception:
        return ""


def _space_for(engine: str, requested: str) -> str | None:
    """Which server an engine should use. The Colab voice server (Voice_Server_Colab_Free.ipynb, colab_server/front.py)
    serves EVERY engine with the Hugging Face spaces' endpoint names, so all engines go there first; if it can't
    answer, voice_gen retries the free Hugging Face space, then the labelled fallbacks (user: "make sure all
    engine work , fix it"). Edge doesn't use a link."""
    if engine == "edge":
        return None
    return requested or _saved_colab_url() or None


def _save_colab_url(url: str) -> None:
    tmp = COLAB_URL_FILE.with_suffix(".tmp")
    tmp.write_text(json.dumps({"url": url.strip(), "saved": dt.datetime.now().isoformat(timespec="seconds")}), encoding="utf-8")
    os.replace(tmp, COLAB_URL_FILE)


# ---- Voice Library ▶ previews (Claude, 2026-11-16; user: "make sure all these feature works perfectly") -------
PREVIEW_DIR = OUTPUTS_DIR / "_previews"
PREVIEW_TEXT = {
    "hi": "दोस्तों, सन 1947 में भारत आज़ाद हुआ, और सिर्फ़ 3 साल बाद देश का संविधान लागू हो गया।",
    "en": "In 1947, India became free, and just three years later the constitution came into force.",
}
# reference clips that may be played in the browser (custom / cloned voices)
REF_AUDIO_ROOTS = [ROOT / "out", ROOT / "assets", REFS_DIR, VOICES_DIR]


def _ref_audio_path(rel: str) -> Path | None:
    p = (ROOT / rel).resolve()
    if p.suffix.lower() not in {".wav", ".mp3", ".flac", ".m4a", ".ogg"} or not p.exists():
        return None
    return p if any(r.resolve() in p.parents for r in REF_AUDIO_ROOTS) else None


KAGGLE_JOBS: dict[str, dict] = {}
KAGGLE_LOCK = threading.Lock()


def _kaggle_job_thread(job_id: str, lines: list[dict], voice: str, takes: int) -> None:
    import kaggle_voice
    job = KAGGLE_JOBS[job_id]
    job_dir = OUTPUTS_DIR / job_id
    text_by_n = {int(x["n"]): x["text"] for x in lines}

    def progress(stage: str, info: dict) -> None:
        job["stage"], job["info"] = stage, info
        if stage == "saved":
            n = int(info["n"])
            job["saved"].append(n)
            meta = {"text": text_by_n.get(n, ""), "voice_label": f"{voice} (Kaggle GPU)", "engine_used": "kaggle indic_parler"}
            (job_dir / f"{n}.json").write_text(json.dumps(meta, ensure_ascii=False), encoding="utf-8")
        (job_dir / "kaggle_status.json").write_text(json.dumps(job, ensure_ascii=False), encoding="utf-8")

    try:
        res = kaggle_voice.run(lines, voice, job_dir, takes=takes, progress=progress,
                               should_stop=lambda: bool(job.get("stop")))
        job.update(stage="done", missing=res["missing"],
                   redo=[r["n"] for r in res["report"] if r.get("redo")])
    except kaggle_voice.StoppedByUser as exc:
        job.update(stage="stopped", error=str(exc))
    except Exception as exc:  # noqa: BLE001
        job.update(stage="error", error=str(exc)[:1500])
    finally:
        (job_dir / "kaggle_status.json").write_text(json.dumps(job, ensure_ascii=False), encoding="utf-8")
        KAGGLE_LOCK.release()


def _load_custom_voices() -> list[dict]:
    defaults = [
        {
            "id": "fw_channel_master",
            "name": "Favorite World (Your Trained Voice)",
            "lang": "hi",
            "engine": "chatterbox",
            "ref_path": "out/fw_voice_dataset/speaker_ref.wav",
            "clips_count": 598,
            "duration_sec": 2725.8,
            "badge": "Trained · 598 Clips",
            "description": "Trained on all 6 Favorite World channel voiceovers (45.4 min).",
        },
        {
            "id": "cartesia_vishal_clone",
            "name": "Cartesia Vishal (Sonic-3 Clone)",
            "lang": "hi",
            "engine": "chatterbox",
            "ref_path": "assets/audio/cartesia_2026-10-17T19_54_16Z_Vishal_sonic-3_6_hi-IN.wav",
            "clips_count": 1,
            "duration_sec": 12.0,
            "badge": "Cartesia Clone",
            "description": "Deep, crisp Cartesia Sonic-3 Vishal Hindi documentary voice.",
        },
    ]
    custom: list[dict] = []
    if VOICES_JSON.exists():
        try:
            custom = json.loads(VOICES_JSON.read_text(encoding="utf-8"))
        except Exception:
            custom = []
    seen = {v["id"] for v in custom}
    return custom + [d for d in defaults if d["id"] not in seen]


def _build_trained_voice_profile(
    voice_name: str,
    lang: str,
    description: str,
    files: list[dict],
    append_dataset: bool = True,
) -> dict:
    if not files:
        raise ValueError("Please upload at least one Hindi/English audio file (.wav, .mp3, .m4a)")
    slug = _safe_name(voice_name.lower(), "custom_voice") + "_" + uuid.uuid4().hex[:4]
    vdir = VOICES_DIR / slug
    clips_dir = vdir / "clips"
    clips_dir.mkdir(parents=True, exist_ok=True)

    ffmpeg = voice_gen.get_ffmpeg()
    cleaned_parts: list[bytes] = []
    total_dur = 0.0
    clip_idx = 0

    with tempfile.TemporaryDirectory(prefix="fw-train-") as td:
        td_path = Path(td)
        for f_i, fobj in enumerate(files):
            raw_name = fobj.get("filename") or f"audio_{f_i}.wav"
            b64 = fobj.get("data_b64") or ""
            if "," in b64:
                b64 = b64.split(",", 1)[1]
            raw = base64.b64decode(b64)
            if len(raw) < 200:
                continue
            ext = Path(raw_name).suffix.lower() or ".wav"
            in_p = td_path / f"in_{f_i}{ext}"
            clean_p = td_path / f"clean_{f_i}.wav"
            in_p.write_bytes(raw)
            # Studio cleanup: highpass + de-silence dead air + normalize to -16 LUFS 44.1kHz mono
            af = (
                "highpass=f=80,lowpass=f=14500,"
                "silenceremove=start_periods=1:start_threshold=-42dB:"
                "stop_periods=-1:stop_duration=0.35:stop_threshold=-42dB,"
                "loudnorm=I=-16:TP=-1.5:LRA=9"
            )
            subprocess.run(
                [ffmpeg, "-y", "-hide_banner", "-loglevel", "error", "-i", str(in_p), "-af", af, "-ac", "1", "-ar", "44100", "-c:a", "pcm_s16le", str(clean_p)],
                check=False,
            )
            if not clean_p.exists() or clean_p.stat().st_size < 2000:
                wav_b = voice_gen._ensure_pcm_wav_bytes(raw, input_ext=ext)
                clean_p.write_bytes(wav_b)
            data = clean_p.read_bytes()
            cleaned_parts.append(data)

            # Slice into 7-second training clips
            with wave.open(io.BytesIO(data), "rb") as w:
                sr = w.getframerate()
                nframes = w.getnframes()
                pcm = w.readframes(nframes)
            total_dur += nframes / float(sr)
            step_frames = sr * 7
            for start_f in range(0, nframes, step_frames):
                sub_pcm = pcm[start_f * 2 : (start_f + step_frames) * 2]
                sub_dur = (len(sub_pcm) // 2) / float(sr)
                if sub_dur < 2.2 and clip_idx > 0:
                    continue
                clip_idx += 1
                cp = clips_dir / f"clip_{clip_idx:04d}.wav"
                with wave.open(str(cp), "wb") as cw:
                    cw.setnchannels(1)
                    cw.setsampwidth(2)
                    cw.setframerate(sr)
                    cw.writeframes(sub_pcm)

    if not cleaned_parts:
        raise ValueError("Could not decode uploaded audio files")

    # Build a 15-second Master Reference WAV from the cleanest segments for zero-shot cloning
    combined_wav = voice_gen._concat_wav_bytes(cleaned_parts, pause_ms=140)
    with wave.open(io.BytesIO(combined_wav), "rb") as w:
        sr = w.getframerate()
        max_ref_frames = min(w.getnframes(), int(sr * 16.0))
        ref_pcm = w.readframes(max_ref_frames)
    master_ref = vdir / "master_ref.wav"
    with wave.open(str(master_ref), "wb") as mw:
        mw.setnchannels(1)
        mw.setsampwidth(2)
        mw.setframerate(sr)
        mw.writeframes(ref_pcm)

    # Also copy master_ref into refs/ so it appears in all reference dropdowns
    ref_copy = REFS_DIR / f"{slug}_master.wav"
    ref_copy.write_bytes(master_ref.read_bytes())

    # Optionally append to out/fw_voice_dataset for cloud fine-tuning
    ds_dir = ROOT / "out" / "fw_voice_dataset"
    ds_wavs = ds_dir / "wavs"
    appended_count = 0
    if append_dataset and ds_wavs.exists():
        meta_jsonl = ds_dir / "metadata.jsonl"
        with open(meta_jsonl, "a", encoding="utf-8") as mf:
            for cp in sorted(clips_dir.glob("*.wav")):
                dest_name = f"user_{slug}_{cp.name}"
                dest_p = ds_wavs / dest_name
                subprocess.run(
                    [ffmpeg, "-y", "-hide_banner", "-loglevel", "error", "-i", str(cp), "-ac", "1", "-ar", "24000", "-c:a", "pcm_s16le", str(dest_p)],
                    check=False,
                )
                if dest_p.exists():
                    appended_count += 1
                    row = {
                        "file_name": f"wavs/{dest_name}",
                        "transcription": description or "नमस्ते दोस्तों, फेवरेट वर्ल्ड में आपका स्वागत है।",
                        "text_description": "FavoriteWorld speaks clearly in a warm, expressive, studio-quality Hindi documentary narrator voice with natural pacing and no background noise.",
                    }
                    mf.write(json.dumps(row, ensure_ascii=False) + "\n")

    rel_ref = str(master_ref.relative_to(ROOT)).replace("\\", "/")
    entry = {
        "id": slug,
        "name": voice_name.strip() or f"Trained Voice ({slug})",
        "lang": lang or "hi",
        "engine": "chatterbox",
        "ref_path": rel_ref,
        "clips_count": max(1, clip_idx),
        "duration_sec": round(total_dur, 1),
        "appended_to_dataset": appended_count,
        "badge": f"Custom · {max(1, clip_idx)} Clips ({round(total_dur, 1)}s)",
        "description": description.strip() or f"Trained from {len(files)} uploaded voiceover file(s).",
        "created_at": dt.datetime.now().isoformat(timespec="seconds"),
    }
    existing: list[dict] = []
    if VOICES_JSON.exists():
        try:
            existing = json.loads(VOICES_JSON.read_text(encoding="utf-8"))
        except Exception:
            existing = []
    existing.insert(0, entry)
    VOICES_JSON.write_text(json.dumps(existing, ensure_ascii=False, indent=2), encoding="utf-8")
    return entry


def _safe_name(name: str, fallback: str = "file") -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "_", (name or "").strip()).strip("._")
    return cleaned[:80] or fallback


def _resolve_ref_path(ref_str: str | None) -> Path | None:
    if not ref_str:
        return None
    p = Path(ref_str)
    if not p.is_absolute():
        p = (ROOT / p).resolve()
    else:
        p = p.resolve()
    allowed_roots = (ROOT.resolve(), REFS_DIR.resolve())
    if not any(p == r or r in p.parents for r in allowed_roots):
        raise ValueError("Reference path outside workspace")
    if not p.exists() or not p.is_file():
        raise FileNotFoundError(f"Reference audio not found: {ref_str}")
    return p


def _tts_warnings(text: str) -> list[str]:
    """Flag all-caps acronyms or unhandled symbols after automatic Hindi number normalization."""
    normalized = voice_gen.clean_spoken(text)
    flags: list[str] = []
    if re.search(r"\d", normalized) and re.search(r"[\u0900-\u097F]", normalized):
        flags.append("Contains digits")
    if re.search(r"\b[A-Z]{2,5}\b", normalized):
        flags.append("Contains uppercase acronym (verify spoken pronunciation)")
    if re.search(r"[$€£°/\\&+=]", normalized):
        flags.append("Contains symbol ($, /, &, etc.)")
    return flags


def _lan_ips() -> list[str]:
    ips: list[str] = []
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ip = info[4][0]
            if not ip.startswith("127.") and ip not in ips:
                ips.append(ip)
    except Exception:
        pass
    return ips


class StudioHandler(BaseHTTPRequestHandler):
    server_version = "VoiceoverStudioPro/1.0"

    def log_message(self, fmt: str, *args) -> None:
        # Quiet asset logs; show errors/API calls concisely
        if args and str(args[1]).startswith(("4", "5")):
            super().log_message(fmt, *args)

    def _send_json(self, data: dict | list, status: int = 200) -> None:
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _read_json(self) -> dict:
        length = int(self.headers.get("Content-Length", "0") or 0)
        if length <= 0 or length > 250 * 1024 * 1024:
            raise ValueError("Invalid request body size")
        raw = self.rfile.read(length)
        return json.loads(raw.decode("utf-8"))

    def _serve_file(self, path: Path, download_name: str | None = None) -> None:
        if not path.exists() or not path.is_file():
            self.send_error(HTTPStatus.NOT_FOUND, "Not found")
            return
        ctype, _ = mimetypes.guess_type(str(path))
        if path.suffix == ".html":
            ctype = "text/html; charset=utf-8"
        elif path.suffix == ".wav":
            ctype = "audio/wav"
        data = path.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", ctype or "application/octet-stream")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        if download_name:
            self.send_header("Content-Disposition", f'attachment; filename="{download_name}"')
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        path = unquote(parsed.path)

        if path in ("/", "/index.html"):
            self._serve_file(STUDIO_DIR / "index.html")
            return

        if path == "/api/meta":
            self._send_json({
                "voices": voice_gen.CURATED_VOICES,
                "custom_voices": _load_custom_voices(),
                "spaces": voice_gen.DEFAULT_SPACES,
                "refs": voice_gen.discover_local_refs(),
                "has_hf_token": bool(voice_gen.load_env_key("HF_TOKEN")),
                "cloud_only": True,
            })
            return

        if path == "/api/status":
            status = voice_gen.check_cloud_status()
            colab = _saved_colab_url()
            if colab:                                  # the user's own free Colab voice server
                try:
                    import requests as _rq
                    rr = _rq.get(colab.rstrip("/") + "/config", timeout=8)
                    status["colab"] = {"ok": rr.ok, "status": rr.status_code, "url": colab}
                except Exception as exc:  # noqa: BLE001
                    status["colab"] = {"ok": False, "status": str(exc)[:120], "url": colab}
            else:
                status["colab"] = {"ok": False, "status": "no link saved", "url": ""}
            self._send_json(status)
            return

        if path == "/api/colab-url":
            self._send_json({"ok": True, "url": _saved_colab_url()})
            return

        if path == "/api/ref-audio":
            from urllib.parse import parse_qs
            target = _ref_audio_path((parse_qs(parsed.query).get("path") or [""])[0])
            if target is None:
                self.send_error(HTTPStatus.NOT_FOUND)
                return
            self._serve_file(target)
            return

        if path == "/api/kaggle-job":
            from urllib.parse import parse_qs
            job_id = _safe_name((parse_qs(parsed.query).get("job_id") or [""])[0], "")
            job = KAGGLE_JOBS.get(job_id)
            if job is None:
                p = OUTPUTS_DIR / job_id / "kaggle_status.json"
                job = json.loads(p.read_text(encoding="utf-8")) if job_id and p.exists() else None
            if job is None:
                self._send_json({"ok": False, "error": "unknown job"}, status=404)
                return
            files = {int(p.stem): f"/outputs/{job_id}/{p.name}" for p in (OUTPUTS_DIR / job_id).glob("*.wav") if p.stem.isdigit()}
            self._send_json({"ok": True, **job, "files": files})
            return

        if path == "/api/conversations":
            conv_p = ROOT / "out" / "hindi_conversations_100" / "conversations.json"
            if conv_p.exists():
                self._send_json(json.loads(conv_p.read_text(encoding="utf-8")))
            else:
                self._send_json({"total_clips": 0, "items": []})
            return

        if path == "/api/history":
            items: list[dict] = []
            for p in sorted((w for w in OUTPUTS_DIR.rglob("*.wav") if not {"_previews", "_trash"} & set(w.parts)), key=lambda x: x.stat().st_mtime, reverse=True)[:40]:
                rel = p.relative_to(OUTPUTS_DIR).as_posix()
                try:
                    dur = round(voice_gen.wav_duration_secs(p.read_bytes()), 2)
                except Exception:
                    dur = 0.0
                meta_p = p.with_suffix(".json")
                meta = {}
                if meta_p.exists():
                    try:
                        meta = json.loads(meta_p.read_text(encoding="utf-8"))
                    except Exception:
                        meta = {}
                mtime_dt = dt.datetime.fromtimestamp(p.stat().st_mtime)
                items.append({
                    "name": p.name,
                    "rel": rel,
                    "url": f"/outputs/{rel}",
                    "duration": dur,
                    "size": p.stat().st_size,
                    "text": meta.get("text") or p.stem,
                    "voice_label": meta.get("voice_label") or "Vishal",
                    "engine_used": meta.get("engine_used") or "chatterbox",
                    "time_str": mtime_dt.strftime("%I:%M %p").lstrip("0"),
                    "date_str": mtime_dt.strftime("%A, %B %d"),
                })
            self._send_json({"items": items})
            return

        if path.startswith("/conv-wavs/"):
            rel = path[len("/conv-wavs/"):].lstrip("/")
            conv_wavs_dir = (ROOT / "out" / "hindi_conversations_100" / "wavs").resolve()
            target = (conv_wavs_dir / rel).resolve()
            if conv_wavs_dir not in target.parents:
                self.send_error(HTTPStatus.FORBIDDEN)
                return
            self._serve_file(target)
            return

        if path.startswith("/outputs/"):
            rel = path[len("/outputs/"):].lstrip("/")
            target = (OUTPUTS_DIR / rel).resolve()
            if OUTPUTS_DIR.resolve() not in target.parents and target != OUTPUTS_DIR.resolve():
                self.send_error(HTTPStatus.FORBIDDEN)
                return
            self._serve_file(target)
            return

        if path.startswith("/refs/"):
            rel = path[len("/refs/"):].lstrip("/")
            target = (REFS_DIR / rel).resolve()
            if REFS_DIR.resolve() not in target.parents:
                self.send_error(HTTPStatus.FORBIDDEN)
                return
            self._serve_file(target)
            return

        self.send_error(HTTPStatus.NOT_FOUND)

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        path = unquote(parsed.path)

        try:
            if path == "/api/split":
                body = self._read_json()
                text = body.get("text", "")
                sents = voice_gen.split_sentences(text)
                rows = [{"n": i + 1, "text": s, "warnings": _tts_warnings(s)} for i, s in enumerate(sents)]
                self._send_json({"sentences": rows})
                return

            if path == "/api/kaggle-job":
                body = self._read_json()
                lines = [{"n": int(x["n"]), "text": str(x["text"])} for x in (body.get("sentences") or []) if str(x.get("text", "")).strip()]
                if not lines:
                    raise ValueError("No sentences to send")
                voice = (body.get("voice") or "Aman").strip()
                takes = max(1, min(3, int(body.get("takes", 2))))
                job_id = _safe_name(body.get("job_id") or dt.datetime.now().strftime("kaggle_%Y%m%d_%H%M%S"), "job")
                if not KAGGLE_LOCK.acquire(blocking=False):
                    raise ValueError("A Kaggle job is already running - wait for it to finish.")
                (OUTPUTS_DIR / job_id).mkdir(parents=True, exist_ok=True)
                KAGGLE_JOBS[job_id] = {"job_id": job_id, "voice": voice, "lines": len(lines), "takes": takes,
                                       "stage": "starting", "info": {}, "saved": []}
                threading.Thread(target=_kaggle_job_thread, args=(job_id, lines, voice, takes), daemon=True).start()
                self._send_json({"ok": True, "job_id": job_id})
                return

            if path == "/api/kaggle-job/stop":
                body = self._read_json()
                job_id = _safe_name(body.get("job_id") or "", "")
                job = KAGGLE_JOBS.get(job_id)
                if not job:
                    raise ValueError("No such Kaggle job")
                job["stop"] = True                      # the job thread cancels the Kaggle run within ~3 s
                self._send_json({"ok": True})
                return

            if path == "/api/history/delete":
                # Delete voiceovers from History (user, 2026-11-16). Files are MOVED to outputs/_trash/<time>/,
                # not erased, so a mistake can be undone by moving them back.
                body = self._read_json()
                if body.get("all"):
                    targets = [w for w in OUTPUTS_DIR.rglob("*.wav") if not {"_previews", "_trash"} & set(w.parts)]
                else:
                    targets = []
                    for rel in body.get("rels") or []:
                        t = (OUTPUTS_DIR / str(rel)).resolve()
                        if OUTPUTS_DIR.resolve() in t.parents and t.suffix.lower() == ".wav" and t.exists()                                 and not {"_previews", "_trash"} & set(t.parts):
                            targets.append(t)
                trash = OUTPUTS_DIR / "_trash" / dt.datetime.now().strftime("%Y%m%d_%H%M%S")
                moved = 0
                for w in targets:
                    rel = w.resolve().relative_to(OUTPUTS_DIR.resolve())
                    for f in (w, w.with_suffix(".json")):
                        if f.exists():
                            dest = trash / rel.parent / f.name
                            dest.parent.mkdir(parents=True, exist_ok=True)
                            os.replace(f, dest)
                    moved += 1
                self._send_json({"ok": True, "deleted": moved, "trash": str(trash.relative_to(ROOT)).replace("\\", "/")})
                return

            if path == "/api/voice-preview":
                body = self._read_json()
                engine = (body.get("engine") or "").strip()
                voice = (body.get("voice") or "").strip()
                ref_path = (body.get("ref_path") or "").strip()
                if ref_path:                                   # custom / cloned voice: play its own reference clip
                    if _ref_audio_path(ref_path) is None:
                        raise FileNotFoundError("This voice's reference clip is missing")
                    self._send_json({"ok": True, "url": "/api/ref-audio?path=" + urllib_quote(ref_path), "cached": True})
                    return
                langs = str(body.get("lang") or "hi")
                lang = "hi" if ("hi" in langs or "hinglish" in langs) else ("en-IN" if "en-IN" in langs else "en")
                if engine == "edge" and voice and not voice.startswith("hi-") and lang == "hi":
                    lang = "hi" if "Multilingual" in voice else "en"
                name = _safe_name(f"{engine}_{voice or 'default'}_{lang}", "preview") + ".wav"
                out_file = PREVIEW_DIR / name
                if not out_file.exists():
                    text = PREVIEW_TEXT["hi" if lang == "hi" else "en"]
                    wav, used = voice_gen.generate_voiceover_bytes(
                        text=text, engine=engine, lang=lang, voice=voice,
                        space_url=_saved_colab_url() or None, fallback_edge=False)
                    PREVIEW_DIR.mkdir(parents=True, exist_ok=True)
                    tmp = out_file.with_suffix(".part")
                    tmp.write_bytes(wav)
                    os.replace(tmp, out_file)
                self._send_json({"ok": True, "url": f"/outputs/_previews/{name}", "cached": True})
                return

            if path == "/api/colab-url":
                body = self._read_json()
                url = str(body.get("url") or "").strip()
                if url and not re.match(r"^https://[\w.-]+(:\d+)?/?$", url):
                    raise ValueError("Paste just the link, like https://abcd1234.gradio.live")
                _save_colab_url(url.rstrip("/"))
                self._send_json({"ok": True, "url": _saved_colab_url()})
                return

            if path == "/api/merge-job":
                # Join a job's 1.wav, 2.wav ... into one clip (used when Generate made the voice on Kaggle)
                body = self._read_json()
                job_id = _safe_name(body.get("job_id") or "", "")
                job_dir = (OUTPUTS_DIR / job_id).resolve()
                if not job_id or not job_dir.exists() or OUTPUTS_DIR.resolve() not in job_dir.parents:
                    raise FileNotFoundError("Job folder not found")
                wavs = sorted([p for p in job_dir.glob("*.wav") if p.stem.isdigit()], key=lambda p: int(p.stem))
                if not wavs:
                    raise ValueError("No audio in this job")
                data = wavs[0].read_bytes() if len(wavs) == 1 else voice_gen._concat_wav_bytes(
                    [p.read_bytes() for p in wavs], pause_ms=int(body.get("pause_ms", 180)))
                out_file = OUTPUTS_DIR / "single" / f"{job_id}.wav"
                out_file.parent.mkdir(parents=True, exist_ok=True)
                out_file.write_bytes(data)
                dur = round(voice_gen.wav_duration_secs(data), 2)
                out_file.with_suffix(".json").write_text(json.dumps({
                    "text": body.get("text") or "", "voice_label": body.get("voice_label") or "Kaggle GPU",
                    "engine_used": "kaggle indic_parler", "duration": dur}, ensure_ascii=False), encoding="utf-8")
                self._send_json({"ok": True, "url": f"/outputs/single/{out_file.name}", "duration": dur})
                return

            if path == "/api/train-voice":
                body = self._read_json()
                voice_name = (body.get("voice_name") or "My Trained Hindi Voice").strip()
                lang = (body.get("lang") or "hi").strip()
                description = (body.get("description") or "").strip()
                append_dataset = bool(body.get("append_dataset", True))
                files = body.get("files") or []
                entry = _build_trained_voice_profile(
                    voice_name=voice_name,
                    lang=lang,
                    description=description,
                    files=files,
                    append_dataset=append_dataset,
                )
                self._send_json({
                    "ok": True,
                    "voice": entry,
                    "custom_voices": _load_custom_voices(),
                    "refs": voice_gen.discover_local_refs(),
                })
                return

            if path == "/api/upload-ref":
                body = self._read_json()
                raw_name = body.get("filename", "reference.wav")
                b64 = body.get("data_b64", "")
                if "," in b64:
                    b64 = b64.split(",", 1)[1]
                raw = base64.b64decode(b64)
                if len(raw) < 200 or len(raw) > 50 * 1024 * 1024:
                    raise ValueError("Reference audio must be between 200 B and 50 MB")
                ext = Path(raw_name).suffix.lower()
                if ext not in {".wav", ".mp3", ".flac", ".m4a", ".ogg", ".webm"}:
                    ext = ".wav"
                stem = _safe_name(Path(raw_name).stem, "voice_ref")
                # Normalize uploaded ref to clean 44.1kHz mono WAV so all cloud spaces accept it reliably
                wav_bytes = voice_gen._ensure_pcm_wav_bytes(raw, input_ext=ext)
                dest = REFS_DIR / f"{stem}.wav"
                dest.write_bytes(wav_bytes)
                rel = str(dest.relative_to(ROOT)).replace("\\", "/")
                self._send_json({"ok": True, "label": f"Uploaded: {stem}", "path": rel, "refs": voice_gen.discover_local_refs()})
                return

            if path == "/api/generate":
                body = self._read_json()
                text = (body.get("text") or "").strip()
                if not text:
                    raise ValueError("Text is required")
                engine = (body.get("engine") or "chatterbox").strip()
                lang = (body.get("lang") or "hi").strip()
                voice = (body.get("voice") or "").strip()
                ref_path = _resolve_ref_path(body.get("ref_path"))
                ref_text = (body.get("ref_text") or "").strip()
                job_id = _safe_name(body.get("job_id") or dt.datetime.now().strftime("job_%Y%m%d_%H%M%S"), "job")
                filename = _safe_name(body.get("filename") or f"vo_{uuid.uuid4().hex[:6]}.wav", "vo.wav")
                if not filename.lower().endswith(".wav"):
                    filename += ".wav"

                wav_bytes, used = voice_gen.generate_voiceover_bytes(
                    text=text,
                    engine=engine,
                    lang=lang,
                    voice=voice,
                    ref_audio=ref_path,
                    ref_text=ref_text,
                    exaggeration=float(body.get("exaggeration", 0.55)),
                    temperature=float(body.get("temperature", 0.75)),
                    cfg_pace=float(body.get("pace", 0.5)),
                    seed=int(body.get("seed", 0)),
                    rate=str(body.get("rate") or "+0%"),
                    pitch=str(body.get("pitch") or "+0Hz"),
                    instruct=str(body.get("instruct") or ""),
                    voice_description=str(body.get("voice_description") or ""),
                    # a page that sends no link (other browser, phone, old tab) still uses the saved Colab link
                    space_url=_space_for(engine, (body.get("space_url") or "").strip()),
                    parler_space_url=_saved_colab_url() or None,
                    hf_token=(body.get("hf_token") or "").strip() or None,
                    master=bool(body.get("master", True)),
                    trim_silence=bool(body.get("trim_silence", True)),
                    # never swap the Indic-Parler voices for Edge, even if an old page asks for the fallback
                    fallback_edge=bool(body.get("fallback_edge", False)) and not (
                        engine == "indic_parler" and voice in ("Aman", "Rohit", "Divya", "Rani", "FavoriteWorld")),
                    speed=float(body.get("speed", 1.0)),
                    pitch_semitones=float(body.get("pitch_semitones", 0.0)),
                    emotion_preset=str(body.get("emotion_preset") or ""),
                    breath_mode=str(body.get("breath_mode") or "auto"),
                )

                job_dir = OUTPUTS_DIR / job_id
                job_dir.mkdir(parents=True, exist_ok=True)
                out_file = job_dir / filename
                tmp_file = job_dir / (filename + ".part")
                tmp_file.write_bytes(wav_bytes)
                os.replace(tmp_file, out_file)

                dur = round(voice_gen.wav_duration_secs(wav_bytes), 2)
                voice_label = str(body.get("voice_label") or voice or "Vishal").strip()
                # Claude, 2026-11-16: when the chosen voice's free cloud is out of daily GPU time, voice_gen falls back
                # to Microsoft Edge (Madhur/Prabhat). Say so - before, the clip kept the chosen name ("Vishal",
                # "Aman") and the user thought the studio ignored their voice choice.
                fallback = "fallback" in used or "auto-cloud" in used
                if "auto-cloud" in used:              # Chatterbox/IndicF5 busy -> Rohit (Indic-Parler) made the line
                    voice_label = f"Rohit (fallback - {voice_label} busy)"
                elif fallback:
                    lg = lang.lower()
                    fb_voice = "Madhur" if lg.startswith("hi") else "Prabhat" if lg == "en-in" else "Andrew"  # tts_edge_bytes defaults
                    voice_label = f"Edge {fb_voice} (fallback - {voice_label} busy)"
                out_file.with_suffix(".json").write_text(
                    json.dumps({"text": text, "voice_label": voice_label, "engine_used": used, "duration": dur}, ensure_ascii=False),
                    encoding="utf-8",
                )
                self._send_json({
                    "ok": True,
                    "job_id": job_id,
                    "filename": filename,
                    "url": f"/outputs/{job_id}/{filename}",
                    "duration": dur,
                    "engine_used": used,
                    "voice_label": voice_label,
                    "fallback": fallback,
                })
                return

            if path == "/api/batch-zip":
                body = self._read_json()
                job_id = _safe_name(body.get("job_id") or "", "")
                if not job_id:
                    raise ValueError("job_id is required")
                job_dir = (OUTPUTS_DIR / job_id).resolve()
                if not job_dir.exists() or OUTPUTS_DIR.resolve() not in job_dir.parents:
                    raise FileNotFoundError("Job folder not found")

                wavs = sorted(
                    [p for p in job_dir.glob("*.wav") if p.stem.isdigit()],
                    key=lambda p: int(p.stem),
                )
                if not wavs:
                    wavs = sorted(job_dir.glob("*.wav"))
                if not wavs:
                    raise ValueError("No generated WAV files in job folder")

                include_merged = bool(body.get("include_merged", True))
                zbuf = io.BytesIO()
                with zipfile.ZipFile(zbuf, "w", zipfile.ZIP_DEFLATED) as zf:
                    parts: list[bytes] = []
                    for w in wavs:
                        data = w.read_bytes()
                        parts.append(data)
                        zf.writestr(w.name, data)
                    if include_merged and len(parts) > 1:
                        merged = voice_gen._concat_wav_bytes(parts, pause_ms=int(body.get("pause_ms", 180)))
                        zf.writestr("FULL_VOICEOVER_MERGED.wav", merged)

                payload = zbuf.getvalue()
                self.send_response(HTTPStatus.OK)
                self.send_header("Content-Type", "application/zip")
                self.send_header("Content-Length", str(len(payload)))
                self.send_header("Content-Disposition", f'attachment; filename="{job_id}_voiceover.zip"')
                self.end_headers()
                self.wfile.write(payload)
                return

            self.send_error(HTTPStatus.NOT_FOUND)
        except voice_gen.CloudLimitError as exc:
            self._send_json({"ok": False, "limit": True, "error": str(exc)}, status=429)
        except Exception as exc:
            self._send_json({"ok": False, "error": str(exc)}, status=400)


def main() -> None:
    p = argparse.ArgumentParser(description="Voiceover Studio Pro server (Port 7413)")
    p.add_argument("--port", type=int, default=int(os.environ.get("PORT", "7413")))
    p.add_argument("--lan", action="store_true", help="Bind 0.0.0.0 so phones on same Wi-Fi can connect")
    p.add_argument("--no-open", action="store_true")
    args = p.parse_args()

    host = "0.0.0.0" if args.lan else "127.0.0.1"
    httpd = ThreadingHTTPServer((host, args.port), StudioHandler)
    print(f"Voiceover Studio Pro (100% Cloud AI): http://localhost:{args.port}")
    if args.lan:
        for ip in _lan_ips():
            print(f"On your phone (same Wi-Fi): http://{ip}:{args.port}")
    if not args.no_open:
        webbrowser.open(f"http://localhost:{args.port}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down Voiceover Studio Pro.")


if __name__ == "__main__":
    main()
