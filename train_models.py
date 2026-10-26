import os
import json
import time
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_recall_fscore_support, confusion_matrix
import joblib

os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

print("=" * 70)
print("[*] TRACE 2.0 ML/DL MODEL TRAINING PIPELINE - HARDWARE ACCELERATED")
print("=" * 70)

# Verify NVIDIA RTX 5060 GPU with CPU fallback
device = torch.device("cuda:0" if torch.cuda.is_available() else "cpu")
print(f"[*] Compute Target Device: {device}")
if torch.cuda.is_available():
    print(f"[*] GPU Model: {torch.cuda.get_device_name(0)}")
    print(f"[*] GPU Memory: {torch.cuda.get_device_properties(0).total_memory / (1024**3):.2f} GB")
    print(f"[*] CUDA Version: {torch.version.cuda}")
else:
    print("[!] Warning: CUDA device not detected, falling back to CPU.")

MODELS_DIR = os.path.join(os.path.dirname(__file__), "fastapi_engine", "models")
os.makedirs(MODELS_DIR, exist_ok=True)

np.random.seed(42)
torch.manual_seed(42)

# ==============================================================================
# MODEL 1: DEEP LEARNING (PyTorch) - Document Layout & Visual Page Classifier
# Architecture: Lightweight ConvNet with BatchNorm & Dropout (< 2 MB)
# Classes: [0: Certificate/NOC, 1: Affidavit, 2: Financial/FDR, 3: Site/Floor Plan]
# ==============================================================================
print("\n" + "-" * 70)
print("[+] [1/3] Training Deep Learning Model: Document Layout Classifier (CNN)")
print("-" * 70)


class DocumentLayoutCNN(nn.Module):
    def __init__(self, num_classes=4):
        super(DocumentLayoutCNN, self).__init__()
        self.features = nn.Sequential(
            nn.Conv2d(1, 16, kernel_size=3, padding=1),
            nn.BatchNorm2d(16),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=2, stride=2),  # 32x32

            nn.Conv2d(16, 32, kernel_size=3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=2, stride=2),  # 16x16

            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=2, stride=2),  # 8x8
        )
        self.classifier = nn.Sequential(
            nn.Dropout(0.3),
            nn.Linear(64 * 8 * 8, 128),
            nn.ReLU(inplace=True),
            nn.Linear(128, num_classes),
        )

    def forward(self, x):
        x = self.features(x)
        x = x.view(x.size(0), -1)
        x = self.classifier(x)
        return x


def generate_layout_dataset(n_samples=1200):
    X = np.zeros((n_samples, 1, 64, 64), dtype=np.float32)
    y = np.zeros((n_samples,), dtype=np.int64)
    rng = np.random.RandomState(42)

    for i in range(n_samples):
        cat = i % 4
        y[i] = cat
        img = rng.normal(0.08, 0.06, (64, 64)).astype(np.float32)

        # Introduce 15% degraded/noisy scan layouts so held-out test metrics are realistic
        is_degraded = (i % 7 == 0)
        scale = 0.45 if is_degraded else 0.85

        if cat == 0:  # Certificate / NOC
            img[4:12, 10:54] += scale
            img[20:44, 8:56] += scale * 0.5
            img[50:60, 40:58] += scale
        elif cat == 1:  # Sworn Affidavit
            img[2:10, 20:44] += scale
            img[16:50, 12:52] += scale * 0.55
            img[52:62, 8:24] += scale
            img[52:62, 40:56] += scale
        elif cat == 2:  # Financial / Joint FDR
            img[6:14, 8:56] += scale * 0.8
            img[18:48, 6:58:4] += scale
            img[18:48, 6:58:8] += scale
            img[50:58, 36:58] += scale * 0.9
        elif cat == 3:  # Floor Plan / Architect Drawing
            img[4:60, 4] += scale
            img[4:60, 60] += scale
            img[4, 4:60] += scale
            img[60, 4:60] += scale
            img[20:44, 20:44] += scale * 0.7

        if is_degraded:
            img += rng.normal(0.0, 0.22, (64, 64)).astype(np.float32)

        X[i] = np.clip(img, 0.0, 1.0)
    return X, y


print("[*] Generating synthetic document layout maps (1,200 pages across 4 categories, 70/15/15 split)...")
X_lay_all, y_lay_all = generate_layout_dataset(1200)
X_lay_train, X_lay_temp, y_lay_train, y_lay_temp = train_test_split(
    X_lay_all, y_lay_all, test_size=0.30, random_state=42, stratify=y_lay_all
)
X_lay_val, X_lay_test, y_lay_val, y_lay_test = train_test_split(
    X_lay_temp, y_lay_temp, test_size=0.50, random_state=42, stratify=y_lay_temp
)


class LayoutDataset(Dataset):
    def __init__(self, x, y):
        self.x = torch.tensor(x)
        self.y = torch.tensor(y)

    def __len__(self):
        return len(self.y)

    def __getitem__(self, idx):
        return self.x[idx], self.y[idx]


train_loader = DataLoader(LayoutDataset(X_lay_train, y_lay_train), batch_size=32, shuffle=True)
test_loader = DataLoader(LayoutDataset(X_lay_test, y_lay_test), batch_size=64, shuffle=False)

layout_model = DocumentLayoutCNN(num_classes=4).to(device)
criterion = nn.CrossEntropyLoss()
optimizer = optim.AdamW(layout_model.parameters(), lr=0.001, weight_decay=1e-4)

epochs = 12
start_time = time.time()
print(f"[*] Training CNN on {device} ({epochs} epochs)...")

layout_model.train()
for epoch in range(1, epochs + 1):
    total_loss = 0.0
    correct = 0
    total = 0
    for batch_x, batch_y in train_loader:
        batch_x = batch_x.to(device)
        batch_y = batch_y.to(device)

        optimizer.zero_grad()
        outputs = layout_model(batch_x)
        loss = criterion(outputs, batch_y)
        loss.backward()
        optimizer.step()

        total_loss += loss.item() * batch_x.size(0)
        _, preds = torch.max(outputs, 1)
        correct += (preds == batch_y).sum().item()
        total += batch_y.size(0)

    if epoch % 3 == 0 or epoch == epochs:
        print(f"  Epoch [{epoch:02d}/{epochs:02d}] - Loss: {total_loss/total:.4f} | Train Acc: {(correct/total)*100:.2f}%")

gpu_train_time = time.time() - start_time

# Evaluate on held-out test set
layout_model.eval()
y_lay_preds = []
test_loss_sum = 0.0
with torch.no_grad():
    for bx, by in test_loader:
        bx_d = bx.to(device)
        by_d = by.to(device)
        out = layout_model(bx_d)
        loss_b = criterion(out, by_d)
        test_loss_sum += loss_b.item() * bx.size(0)
        preds = torch.argmax(out, dim=1).cpu().numpy()
        y_lay_preds.extend(preds.tolist())

y_lay_preds = np.array(y_lay_preds)
cnn_acc = float(accuracy_score(y_lay_test, y_lay_preds))
cnn_prec, cnn_rec, cnn_f1, _ = precision_recall_fscore_support(
    y_lay_test, y_lay_preds, average="macro", zero_division=0
)
cnn_cm = confusion_matrix(y_lay_test, y_lay_preds).tolist()
cnn_test_loss = float(test_loss_sum / len(y_lay_test))

print(f"[OK] CNN Held-Out Test Accuracy: {cnn_acc*100:.2f}% | Macro-F1: {cnn_f1:.4f}")

model_path = os.path.join(MODELS_DIR, "document_layout_cnn.pt")
torch.save(layout_model.state_dict(), model_path)
model_size_mb = os.path.getsize(model_path) / (1024 * 1024)

# ==============================================================================
# MODEL 2: MACHINE LEARNING (Gradient Boosting) - Compliance Risk & Priority Scorer
# ==============================================================================
print("\n" + "-" * 70)
print("[+] [2/3] Training Machine Learning Model: Compliance Risk Scorer (GBDT)")
print("-" * 70)


def generate_compliance_risk_dataset(n_samples=1500):
    X = np.zeros((n_samples, 8), dtype=np.float32)
    y = np.zeros((n_samples,), dtype=np.int64)
    rng = np.random.RandomState(42)

    for i in range(n_samples):
        crit = rng.choice([0, 1, 2, 3], p=[0.55, 0.25, 0.15, 0.05])
        major = rng.choice([0, 1, 2, 3, 4], p=[0.40, 0.30, 0.15, 0.10, 0.05])
        minor = rng.poisson(1.5)
        contra = rng.choice([0, 1, 2], p=[0.70, 0.20, 0.10])
        ocr_unc = rng.beta(1.5, 8.0)
        days_left = rng.randint(2, 90)
        hist_comp = rng.uniform(0.65, 0.99)
        intake_tier = rng.choice([1, 2, 3, 4])

        X[i] = [crit, major, minor, contra, ocr_unc, days_left, hist_comp, intake_tier]

        risk_score = (
            crit * 35.0
            + major * 18.0
            + minor * 5.0
            + contra * 20.0
            + ocr_unc * 15.0
            + max(0, (30 - days_left) * 0.8)
            - (hist_comp - 0.5) * 15.0
            + rng.normal(0, 4.5)  # realistic boundary variance
        )

        if risk_score > 45.0 or crit >= 1:
            y[i] = 2
        elif risk_score > 20.0 or major >= 1:
            y[i] = 1
        else:
            y[i] = 0

    return X, y


X_risk_all, y_risk_all = generate_compliance_risk_dataset(1500)
X_r_train, X_r_temp, y_r_train, y_r_temp = train_test_split(
    X_risk_all, y_risk_all, test_size=0.30, random_state=42, stratify=y_risk_all
)
X_r_val, X_r_test, y_r_val, y_r_test = train_test_split(
    X_r_temp, y_r_temp, test_size=0.50, random_state=42, stratify=y_r_temp
)

ml_start_time = time.time()
risk_clf = GradientBoostingClassifier(n_estimators=100, learning_rate=0.1, max_depth=4, random_state=42)
risk_clf.fit(X_r_train, y_r_train)
ml_train_time = time.time() - ml_start_time

y_r_pred = risk_clf.predict(X_r_test)
gbdt_acc = float(accuracy_score(y_r_test, y_r_pred))
gbdt_prec, gbdt_rec, gbdt_f1, _ = precision_recall_fscore_support(
    y_r_test, y_r_pred, average="macro", zero_division=0
)
gbdt_cm = confusion_matrix(y_r_test, y_r_pred).tolist()
print(f"[OK] GBDT Held-Out Test Accuracy: {gbdt_acc*100:.2f}% | Macro-F1: {gbdt_f1:.4f}")

ml_model_path = os.path.join(MODELS_DIR, "compliance_risk_gbdt.joblib")
joblib.dump(risk_clf, ml_model_path)
ml_size_mb = os.path.getsize(ml_model_path) / (1024 * 1024)

# ==============================================================================
# MODEL 3: LIGHTWEIGHT DOCUMENT TEXT CLASSIFIER BASELINE (TF-IDF + Logistic Regression)
# ==============================================================================
print("\n" + "-" * 70)
print("[+] [3/3] Training Document Text Classifier Baseline (TF-IDF + LogisticRegression)")
print("-" * 70)


def generate_document_text_corpus(n_per_class=120):
    templates = {
        0: [
            "Structural Stability and Building Completion Certificate issued by Registered Civil Engineer",
            "Certified that Academic Block C laboratory readiness and handover date is prior to 30-Jun-2026",
            "Occupancy and completion certificate for instructional carpet area of 28450 sq.m under APH Clause 4.2.b",
            "Executive Engineer PWD structural soundness endorsement for technical campus buildings",
        ],
        1: [
            "Directorate of Maharashtra Fire and Emergency Services Provisional Fire Safety NOC Certificate",
            "National Building Code NBC Part 4 fire hydrant sprinkler and emergency exit clearance valid through 2027",
            "Renewal of Fire Safety Certificate No NOC-MH-2026 under Clause 4.5 for educational assembly building",
            "Chief Fire Officer inspection report certifying zero fire safety deficiencies in campus blocks",
        ],
        2: [
            "Before the Public Notary Sworn Regulatory Affidavit on Rs 100 Non-Judicial Stamp Paper",
            "I solemnly affirm and declare on oath that all faculty cadre ratios and AICTE norms are satisfied",
            "Notarized undertaking and counter-affidavit signed by Principal and Chairman of Governing Body",
            "Deponent hereby swears that instructional facilities and barrier-free ramps were completed on 01-May-2026",
        ],
        3: [
            "State Bank of India Joint Fixed Deposit Receipt FDR Corpus Fund in favor of Institution and AICTE",
            "Audited Balance Sheet Financial Solvency and Operational Reserve Statement for Academic Year 2026-27",
            "Chartered Accountant certificate confirming statutory endowment deposit of Rs 150 Lakhs without lien",
            "Bank renewal endorsement for Joint FDR maturity value and liquidity compliance under APH Chapter IV",
        ],
        4: [
            "Sub-Registrar Land Title Deed and Contiguous Ownership Registry for 12.4 Acres Campus Site",
            "Municipal Corporation Town Planning Cell Approved Master Site Plan and Floor Area Ratio Drawing",
            "Revenue Tehsildar demarcation certificate confirming non-agricultural educational land use conversion",
            "Architect certified campus layout plan showing instructional laboratories library and administrative area",
        ],
    }
    noise_tokens = [
        "Ref-2026", "AICTE-Approval", "Verified-Copy", "Page-1", "Pune-Region",
        "Annexure-IV", "Clause-Check", "Statutory-Filing", "Seal-Attached", "Signed",
    ]
    texts = []
    labels = []
    rng = np.random.RandomState(42)
    for cls_id, base_list in templates.items():
        for i in range(n_per_class):
            base = base_list[i % len(base_list)]
            # Add 6% ambiguous cross-referenced documents to test confusion matrix realistically
            if i % 16 == 0:
                other_cls = (cls_id + 1) % 5
                base = f"{templates[other_cls][0][:45]} attached to {base[:30]}"
            extra = " ".join(rng.choice(noise_tokens, size=3, replace=False))
            texts.append(f"{base} {extra} doc_seq_{i}")
            labels.append(cls_id)
    return texts, np.array(labels, dtype=np.int64)


texts_all, labels_all = generate_document_text_corpus(120)
X_txt_train, X_txt_temp, y_txt_train, y_txt_temp = train_test_split(
    texts_all, labels_all, test_size=0.30, random_state=42, stratify=labels_all
)
X_txt_val, X_txt_test, y_txt_val, y_txt_test = train_test_split(
    X_txt_temp, y_txt_temp, test_size=0.50, random_state=42, stratify=y_txt_temp
)

tfidf_start = time.time()
doc_text_clf = Pipeline([
    ("tfidf", TfidfVectorizer(ngram_range=(1, 2), max_features=2500, sublinear_tf=True)),
    ("clf", LogisticRegression(C=1.0, max_iter=500, random_state=42)),
])
doc_text_clf.fit(X_txt_train, y_txt_train)
tfidf_train_time = time.time() - tfidf_start

y_txt_pred = doc_text_clf.predict(X_txt_test)
tfidf_test_acc = float(accuracy_score(y_txt_test, y_txt_pred))
tfidf_prec, tfidf_rec, tfidf_f1, _ = precision_recall_fscore_support(
    y_txt_test, y_txt_pred, average="macro", zero_division=0
)
tfidf_cm = confusion_matrix(y_txt_test, y_txt_pred).tolist()

tfidf_model_path = os.path.join(MODELS_DIR, "doc_text_tfidf_logreg.joblib")
joblib.dump(doc_text_clf, tfidf_model_path)
tfidf_size_mb = os.path.getsize(tfidf_model_path) / (1024 * 1024)
print(f"[OK] TF-IDF + LogisticRegression Held-Out Test Accuracy: {tfidf_test_acc*100:.2f}% | Macro-F1: {tfidf_f1:.4f}")

# Save Held-Out Test Splits so `/models/{id}/evaluate` runs live inference on the held-out split
eval_fixtures_path = os.path.join(MODELS_DIR, "held_out_eval_splits.npz")
np.savez_compressed(
    eval_fixtures_path,
    X_lay_test=X_lay_test,
    y_lay_test=y_lay_test,
    X_r_test=X_r_test,
    y_r_test=y_r_test,
    X_txt_test=np.array(X_txt_test, dtype=object),
    y_txt_test=y_txt_test,
)

# ==============================================================================
# Model Metadata & Evaluation Report
# ==============================================================================
metadata = {
    "trainedAt": time.strftime("%Y-%m-%d %H:%M:%S"),
    "hardware": {
        "accelerator": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU",
        "cudaVersion": torch.version.cuda if torch.cuda.is_available() else "N/A",
        "pytorchVersion": torch.__version__,
    },
    "models": [
        {
            "id": "doc-layout-cnn",
            "name": "DocumentLayoutCNN",
            "type": "Deep Learning (PyTorch CNN)",
            "classes": ["Certificate/NOC", "Sworn Affidavit", "Financial FDR", "Architectural Site Plan"],
            "parameters": sum(p.numel() for p in layout_model.parameters()),
            "artifactPath": "fastapi_engine/models/document_layout_cnn.pt",
            "sizeBytes": os.path.getsize(model_path),
            "sizeMB": round(model_size_mb, 3),
            "evaluatedSamples": int(len(y_lay_test)),
            "heldOutAccuracy": round(cnn_acc, 4),
            "heldOutPrecision": round(float(cnn_prec), 4),
            "heldOutRecall": round(float(cnn_rec), 4),
            "heldOutMacroF1": round(float(cnn_f1), 4),
            "heldOutLoss": round(cnn_test_loss, 4),
            "confusionMatrix": cnn_cm,
            "validationStatus": "Experimental Prototype (Measured on 15% held-out synthetic layout split; never substitutes for official AICTE scrutiny)",
        },
        {
            "id": "compliance-risk-gbdt",
            "name": "ComplianceRiskGBDT",
            "type": "Machine Learning (Gradient Boosting Decision Trees)",
            "classes": ["Low Risk (Expedited)", "Moderate Risk (Standard)", "High Risk (Urgent/Critical)"],
            "artifactPath": "fastapi_engine/models/compliance_risk_gbdt.joblib",
            "sizeBytes": os.path.getsize(ml_model_path),
            "sizeMB": round(ml_size_mb, 3),
            "evaluatedSamples": int(len(y_r_test)),
            "heldOutAccuracy": round(gbdt_acc, 4),
            "heldOutPrecision": round(float(gbdt_prec), 4),
            "heldOutRecall": round(float(gbdt_rec), 4),
            "heldOutMacroF1": round(float(gbdt_f1), 4),
            "confusionMatrix": gbdt_cm,
            "validationStatus": "Experimental Prototype (Measured on 15% held-out synthetic compliance vectors; review priority only, never fraud probability)",
        },
        {
            "id": "doc-text-tfidf-logreg",
            "name": "DocTextTFIDFClassifier",
            "type": "Machine Learning Baseline (TF-IDF + Logistic Regression)",
            "classes": [
                "Infrastructure & Completion Certificate",
                "Fire & Safety NOC",
                "Sworn Regulatory Affidavit",
                "Financial Corpus & FDR",
                "Land & Building Plan",
            ],
            "artifactPath": "fastapi_engine/models/doc_text_tfidf_logreg.joblib",
            "sizeBytes": os.path.getsize(tfidf_model_path),
            "sizeMB": round(tfidf_size_mb, 3),
            "evaluatedSamples": int(len(y_txt_test)),
            "heldOutAccuracy": round(tfidf_test_acc, 4),
            "heldOutPrecision": round(float(tfidf_prec), 4),
            "heldOutRecall": round(float(tfidf_rec), 4),
            "heldOutMacroF1": round(float(tfidf_f1), 4),
            "confusionMatrix": tfidf_cm,
            "validationStatus": "Experimental Prototype (Measured on 15% held-out synthetic text split; low-confidence < 0.55 routes to unknown / needs_review)",
        },
    ],
    "budgetCompliance": {
        "totalModelBytes": os.path.getsize(model_path) + os.path.getsize(ml_model_path) + os.path.getsize(tfidf_model_path),
        "totalModelMB": round(
            (os.path.getsize(model_path) + os.path.getsize(ml_model_path) + os.path.getsize(tfidf_model_path))
            / (1024 * 1024),
            2,
        ),
        "budgetCapMB": 50.0,
        "isUnderBudget": (
            os.path.getsize(model_path) + os.path.getsize(ml_model_path) + os.path.getsize(tfidf_model_path)
        )
        < (50 * 1024 * 1024),
    },
}

meta_path = os.path.join(MODELS_DIR, "models_metadata.json")
with open(meta_path, "w") as f:
    json.dump(metadata, f, indent=2)

summary_path = os.path.join(MODELS_DIR, "training_summary.json")
with open(summary_path, "w") as f:
    json.dump(metadata, f, indent=2)

print("\n" + "=" * 70)
print("[SUCCESS] ALL MODELS TRAINED, EVALUATED ON HELD-OUT TEST SPLITS & SAVED")
print(f"[*] Hardware Utilized: {metadata['hardware']['accelerator']}")
print(f"[*] Total Models Storage: {metadata['budgetCompliance']['totalModelMB']} MB / 50.0 MB Cap")
print("=" * 70)
