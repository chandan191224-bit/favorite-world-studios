"""Load-on-first-use + unload-when-idle for the heavier engines (Chatterbox, Qwen, IndicF5).

Kaggle engine test 2026-11-16: with every engine loaded at once on one T4, Qwen hit
"CUBLAS_STATUS_ALLOC_FAILED" (GPU memory full). The user uses one voice at a time, so each heavy engine now loads
when first asked and frees the GPU after FW_IDLE_UNLOAD seconds (default 600) without use."""
import gc, os, threading, time


class LazyModel:
    def __init__(self, name, loader, idle=None):
        self.name, self.loader = name, loader
        self.idle = int(idle or os.environ.get("FW_IDLE_UNLOAD", "600"))
        self.obj, self.last, self.lock = None, 0.0, threading.RLock()
        threading.Thread(target=self._reaper, daemon=True).start()

    def get(self):
        with self.lock:
            if self.obj is None:
                t = time.time()
                try:
                    self.obj = self.loader()
                except RuntimeError as e:          # GPU busy with another engine: free ours and say so plainly
                    self._free()
                    if "CUDA" in str(e) or "out of memory" in str(e).lower():
                        raise RuntimeError(f"{self.name}: GPU memory is busy with another voice engine - try again "
                                           f"in a minute ({str(e)[:120]})") from e
                    raise
                print(f"[{self.name}] loaded in {time.time() - t:.0f}s", flush=True)
            self.last = time.time()
            return self.obj

    def touch(self):
        self.last = time.time()
        _empty_cache()

    def unload(self):
        """Free the GPU now (the front calls this before another heavy engine runs)."""
        with self.lock:
            if self.obj is not None:
                self._free()
                print(f"[{self.name}] unloaded to make room for another engine", flush=True)
        return "ok"

    def _free(self):
        self.obj = None
        gc.collect()
        _empty_cache()

    def _reaper(self):
        while True:
            time.sleep(30)
            with self.lock:
                if self.obj is not None and time.time() - self.last > self.idle:
                    self._free()
                    print(f"[{self.name}] unloaded after {self.idle}s idle (GPU freed)", flush=True)


def _empty_cache():
    try:
        import torch
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
    except Exception:
        pass
