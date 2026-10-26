"""
Real (non-simulated) training routines for the TRACE FastAPI engine.

- funsd-entity-mlp : trained on the real FUNSD benchmark (datasets/funsd) using the
  70/15/15 form-level split in datasets/funsd/prepared_splits.json. Predicts the
  semantic role of a text block (header / question / answer / other) from text
  and geometry. Runs on CUDA when available, otherwise CPU.
- doc-layout-cnn   : trained on the *synthetic* layout generator (clearly labelled).

Every metric returned is measured on a held-out test split. Artifacts are written
under a job-specific, versioned filename and never overwrite the active model.
"""
import hashlib
import json
import os
import time
from typing import Any, Callable, Dict, List, Tuple

import numpy as np
import torch
import torch.nn as nn

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(ROOT, "fastapi_engine", "models")
FUNSD_DIR = os.path.join(ROOT, "datasets", "funsd")
FUNSD_LABELS = ["header", "question", "answer", "other"]
HASH_DIM = 1024
GEO_DIM = 10

Log = Callable[[str], None]
Progress = Callable[[int, int, float, Dict[str, Any]], None]
Cancelled = Callable[[], bool]


def pick_device() -> torch.device:
    # cuDNN autotuning triggers a CUDA/LLVM out-of-memory crash on this RTX 5060 (sm_120) build,
    # so it is disabled; plain cuDNN kernels train correctly.
    torch.backends.cudnn.benchmark = False
    return torch.device("cuda:0" if torch.cuda.is_available() else "cpu")


def _device_info(dev: torch.device) -> Dict[str, Any]:
    if dev.type == "cuda":
        return {"device": "cuda:0", "name": torch.cuda.get_device_name(0), "cuda": torch.version.cuda}
    return {"device": "cpu", "name": "CPU", "cuda": None}


def _hash_ngrams(text: str) -> np.ndarray:
    vec = np.zeros(HASH_DIM, dtype=np.float32)
    t = f"^{text.lower()}$"
    for n in (1, 2, 3):
        for i in range(len(t) - n + 1):
            h = int(hashlib.md5(t[i : i + n].encode("utf-8")).hexdigest()[:8], 16)
            vec[h % HASH_DIM] += 1.0
    s = vec.sum()
    return vec / s if s > 0 else vec


def _geometry(box: List[int], text: str, n_words: int, w: float, h: float) -> np.ndarray:
    x0, y0, x1, y1 = box
    bw, bh = max(x1 - x0, 1), max(y1 - y0, 1)
    return np.array(
        [
            x0 / w, y0 / h, x1 / w, y1 / h,
            bw / w, bh / h, min(bw / bh, 50.0) / 50.0,
            min(n_words, 20) / 20.0,
            1.0 if text.strip().endswith(":") else 0.0,
            1.0 if text.isupper() else 0.0,
        ],
        dtype=np.float32,
    )


def _page_size(split_rel: str) -> Tuple[float, float]:
    try:
        from PIL import Image

        img_path = os.path.join(
            FUNSD_DIR, os.path.dirname(os.path.dirname(split_rel)), "images",
            os.path.splitext(os.path.basename(split_rel))[0] + ".png",
        )
        with Image.open(img_path) as im:
            return float(im.size[0]), float(im.size[1])
    except Exception:
        return 762.0, 1000.0


def _load_funsd_split(rel_paths: List[str]) -> Tuple[np.ndarray, np.ndarray]:
    X, y = [], []
    for rel in rel_paths:
        with open(os.path.join(FUNSD_DIR, rel), "r", encoding="utf-8") as f:
            data = json.load(f)
        w, h = _page_size(rel)
        for ent in data.get("form", []):
            text = (ent.get("text") or "").strip()
            label = ent.get("label")
            if not text or label not in FUNSD_LABELS:
                continue
            feats = np.concatenate(
                [_hash_ngrams(text), _geometry(ent["box"], text, len(ent.get("words", [])), w, h)]
            )
            X.append(feats)
            y.append(FUNSD_LABELS.index(label))
    return np.stack(X).astype(np.float32), np.array(y, dtype=np.int64)


class FunsdEntityMLP(nn.Module):
    def __init__(self, in_dim: int = HASH_DIM + GEO_DIM, n_cls: int = 4):
        super().__init__()
        self.net = nn.Sequential(
            nn.Linear(in_dim, 256), nn.ReLU(), nn.Dropout(0.3),
            nn.Linear(256, 64), nn.ReLU(), nn.Dropout(0.2),
            nn.Linear(64, n_cls),
        )

    def forward(self, x):
        return self.net(x)


def _metrics(y_true: np.ndarray, y_pred: np.ndarray, n_cls: int) -> Dict[str, Any]:
    from sklearn.metrics import accuracy_score, confusion_matrix, precision_recall_fscore_support

    p, r, f, _ = precision_recall_fscore_support(y_true, y_pred, average="macro", zero_division=0)
    return {
        "accuracy": round(float(accuracy_score(y_true, y_pred)), 4),
        "precision": round(float(p), 4),
        "recall": round(float(r), 4),
        "f1": round(float(f), 4),
        "macroF1": round(float(f), 4),
        "confusionMatrix": confusion_matrix(y_true, y_pred, labels=list(range(n_cls))).tolist(),
    }


def train_funsd_entity(
    job_id: str, epochs: int, lr: float, batch_size: int,
    log: Log, progress: Progress, cancelled: Cancelled,
) -> Dict[str, Any]:
    split_file = os.path.join(FUNSD_DIR, "prepared_splits.json")
    if not os.path.exists(split_file):
        raise RuntimeError("FUNSD not prepared. Run: python scripts/datasets.py download && prepare")
    with open(split_file, "r", encoding="utf-8") as f:
        splits = json.load(f)["splits"]

    dev = pick_device()
    info = _device_info(dev)
    log(f"[DEVICE] {info['device']} - {info['name']} (CUDA {info['cuda']})")
    t0 = time.time()
    Xtr, ytr = _load_funsd_split(splits["train"])
    Xva, yva = _load_funsd_split(splits["val"])
    Xte, yte = _load_funsd_split(splits["test"])
    log(f"[DATA] FUNSD text blocks: train={len(ytr)} val={len(yva)} test={len(yte)} (form-level split, no form shared across splits)")

    torch.manual_seed(42)
    counts = np.bincount(ytr, minlength=4).astype(np.float32)
    weights = torch.tensor(counts.sum() / (4 * np.maximum(counts, 1)), device=dev)
    model = FunsdEntityMLP().to(dev)
    opt = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    crit = nn.CrossEntropyLoss(weight=weights)
    Xtr_t, ytr_t = torch.tensor(Xtr, device=dev), torch.tensor(ytr, device=dev)
    Xva_t = torch.tensor(Xva, device=dev)

    best_f1, best_state = -1.0, None
    n = len(ytr)
    for ep in range(1, epochs + 1):
        if cancelled():
            raise InterruptedError("cancelled")
        model.train()
        perm = torch.randperm(n, device=dev)
        total = 0.0
        for i in range(0, n, batch_size):
            idx = perm[i : i + batch_size]
            opt.zero_grad()
            loss = crit(model(Xtr_t[idx]), ytr_t[idx])
            loss.backward()
            opt.step()
            total += loss.item() * len(idx)
        model.eval()
        with torch.no_grad():
            vpred = model(Xva_t).argmax(1).cpu().numpy()
        vm = _metrics(yva, vpred, 4)
        if vm["f1"] > best_f1:
            best_f1 = vm["f1"]
            best_state = {k: v.detach().cpu().clone() for k, v in model.state_dict().items()}
        log(f"[EPOCH {ep:02d}/{epochs:02d}] train_loss={total/n:.4f} val_acc={vm['accuracy']:.4f} val_macroF1={vm['f1']:.4f}")
        progress(ep, epochs, total / n, {"valAccuracy": vm["accuracy"], "valMacroF1": vm["f1"]})

    model.load_state_dict(best_state)
    model.eval()
    with torch.no_grad():
        tpred = model(torch.tensor(Xte, device=dev)).argmax(1).cpu().numpy()
    test = _metrics(yte, tpred, 4)
    os.makedirs(MODELS_DIR, exist_ok=True)
    art = os.path.join(MODELS_DIR, f"funsd_entity_mlp_{job_id}.pt")
    torch.save(best_state, art)
    test.update(
        {
            "evaluatedSamples": int(len(yte)),
            "classes": FUNSD_LABELS,
            "bestValMacroF1": round(best_f1, 4),
            "dataset": "FUNSD (real public benchmark, 199 scanned forms)",
            "trainSeconds": round(time.time() - t0, 2),
            "device": info,
            "status": "Experimental Prototype (real FUNSD held-out forms; English noisy scanned forms, not AICTE documents)",
        }
    )
    return {"metrics": test, "artifactPath": art, "artifactSizeBytes": os.path.getsize(art)}


def _synthetic_layout(n: int):
    rng = np.random.RandomState(42)
    X = np.zeros((n, 1, 64, 64), dtype=np.float32)
    y = np.zeros(n, dtype=np.int64)
    for i in range(n):
        c = i % 4
        y[i] = c
        img = rng.normal(0.08, 0.06, (64, 64)).astype(np.float32)
        deg = i % 7 == 0
        s = 0.45 if deg else 0.85
        if c == 0:
            img[4:12, 10:54] += s; img[20:44, 8:56] += s * 0.5; img[50:60, 40:58] += s
        elif c == 1:
            img[2:10, 20:44] += s; img[16:50, 12:52] += s * 0.55; img[52:62, 8:24] += s; img[52:62, 40:56] += s
        elif c == 2:
            img[6:14, 8:56] += s * 0.8; img[18:48, 6:58:4] += s; img[18:48, 6:58:8] += s; img[50:58, 36:58] += s * 0.9
        else:
            img[4:60, 4] += s; img[4:60, 60] += s; img[4, 4:60] += s; img[60, 4:60] += s; img[20:44, 20:44] += s * 0.7
        if deg:
            img += rng.normal(0.0, 0.22, (64, 64)).astype(np.float32)
        X[i] = np.clip(img, 0, 1)
    return X, y


def train_layout_cnn(
    job_id: str, epochs: int, lr: float, batch_size: int,
    log: Log, progress: Progress, cancelled: Cancelled,
) -> Dict[str, Any]:
    from sklearn.model_selection import train_test_split

    dev = pick_device()
    info = _device_info(dev)
    log(f"[DEVICE] {info['device']} - {info['name']}")
    X, y = _synthetic_layout(1200)
    Xtr, Xt, ytr, yt = train_test_split(X, y, test_size=0.30, random_state=42, stratify=y)
    Xva, Xte, yva, yte = train_test_split(Xt, yt, test_size=0.50, random_state=42, stratify=yt)
    log(f"[DATA] SYNTHETIC layout tensors: train={len(ytr)} val={len(yva)} test={len(yte)}")

    def block(i, o):
        return [nn.Conv2d(i, o, 3, padding=1), nn.BatchNorm2d(o), nn.ReLU(inplace=True), nn.MaxPool2d(2)]

    model = nn.Sequential(
        *block(1, 16), *block(16, 32), *block(32, 64), nn.Flatten(),
        nn.Dropout(0.3), nn.Linear(64 * 8 * 8, 128), nn.ReLU(inplace=True), nn.Linear(128, 4),
    ).to(dev)
    opt = torch.optim.AdamW(model.parameters(), lr=lr, weight_decay=1e-4)
    crit = nn.CrossEntropyLoss()
    Xtr_t, ytr_t = torch.tensor(Xtr, device=dev), torch.tensor(ytr, device=dev)
    Xva_t = torch.tensor(Xva, device=dev)
    best, best_state, t0 = -1.0, None, time.time()
    for ep in range(1, epochs + 1):
        if cancelled():
            raise InterruptedError("cancelled")
        model.train()
        perm = torch.randperm(len(ytr), device=dev)
        tot = 0.0
        for i in range(0, len(ytr), batch_size):
            idx = perm[i : i + batch_size]
            opt.zero_grad()
            loss = crit(model(Xtr_t[idx]), ytr_t[idx])
            loss.backward()
            opt.step()
            tot += loss.item() * len(idx)
        model.eval()
        with torch.no_grad():
            vm = _metrics(yva, model(Xva_t).argmax(1).cpu().numpy(), 4)
        if vm["f1"] > best:
            best, best_state = vm["f1"], {k: v.detach().cpu().clone() for k, v in model.state_dict().items()}
        log(f"[EPOCH {ep:02d}/{epochs:02d}] train_loss={tot/len(ytr):.4f} val_macroF1={vm['f1']:.4f}")
        progress(ep, epochs, tot / len(ytr), {"valMacroF1": vm["f1"]})
    model.load_state_dict(best_state)
    model.eval()
    with torch.no_grad():
        test = _metrics(yte, model(torch.tensor(Xte, device=dev)).argmax(1).cpu().numpy(), 4)
    art = os.path.join(MODELS_DIR, f"document_layout_cnn_{job_id}.pt")
    torch.save(best_state, art)
    test.update(
        {
            "evaluatedSamples": int(len(yte)),
            "classes": ["Certificate/NOC", "Sworn Affidavit", "Financial FDR", "Architectural Site Plan"],
            "trainSeconds": round(time.time() - t0, 2),
            "device": info,
            "status": "Experimental Prototype (SYNTHETIC templated layouts; a high score does not indicate real-world accuracy)",
        }
    )
    return {"metrics": test, "artifactPath": art, "artifactSizeBytes": os.path.getsize(art)}


TRAINERS = {"funsd-entity-mlp": train_funsd_entity, "doc-layout-cnn": train_layout_cnn}
