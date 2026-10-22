import os
import json
import time
import math
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from sklearn.ensemble import GradientBoostingClassifier
import joblib

os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

print("=" * 70)
print("[*] TRACE 2.0 ML/DL MODEL TRAINING PIPELINE - HARDWARE ACCELERATED")
print("=" * 70)

# Verify NVIDIA RTX 5060 GPU
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

# ==============================================================================
# MODEL 1: DEEP LEARNING (PyTorch) - Document Layout & Visual Page Classifier
# Architecture: Lightweight ConvNet with BatchNorm & Dropout (< 2 MB)
# Classes: [0: Certificate/NOC, 1: Affidavit, 2: Financial/FDR, 3: Site/Floor Plan]
# ==============================================================================
print("\n" + "-" * 70)
print("[+] [1/2] Training Deep Learning Model: Document Layout Classifier (CNN)")
print("-" * 70)

class DocumentLayoutCNN(nn.Module):
    def __init__(self, num_classes=4):
        super(DocumentLayoutCNN, self).__init__()
        # Input: 1-channel layout density map (64x64)
        self.features = nn.Sequential(
            nn.Conv2d(1, 16, kernel_size=3, padding=1),
            nn.BatchNorm2d(16),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=2, stride=2), # 32x32

            nn.Conv2d(16, 32, kernel_size=3, padding=1),
            nn.BatchNorm2d(32),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=2, stride=2), # 16x16

            nn.Conv2d(32, 64, kernel_size=3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU(inplace=True),
            nn.MaxPool2d(kernel_size=2, stride=2), # 8x8
        )
        self.classifier = nn.Sequential(
            nn.Dropout(0.3),
            nn.Linear(64 * 8 * 8, 128),
            nn.ReLU(inplace=True),
            nn.Linear(128, num_classes)
        )

    def forward(self, x):
        x = self.features(x)
        x = x.view(x.size(0), -1)
        x = self.classifier(x)
        return x

# Synthetic Document Layout Patterns for Training
# Layout features: Header density, seal position, table grids, signature blocks
np.random.seed(42)
torch.manual_seed(42)

def generate_layout_dataset(n_samples=2000):
    X = np.zeros((n_samples, 1, 64, 64), dtype=np.float32)
    y = np.zeros((n_samples,), dtype=np.int64)

    for i in range(n_samples):
        cat = i % 4
        y[i] = cat
        img = np.random.normal(0.05, 0.02, (64, 64)).astype(np.float32)

        if cat == 0:  # Certificate / NOC: Header text, mid body, bottom seal
            img[4:12, 10:54] += 0.8  # Header authority
            img[20:44, 8:56] += 0.4   # Body text
            img[50:60, 40:58] += 0.9  # Circular stamp / seal
        elif cat == 1: # Sworn Affidavit: Top court stamp, dense centered clauses, dual notary seals
            img[2:10, 20:44] += 0.95 # Judicial stamp
            img[16:50, 12:52] += 0.5  # Sworn declaration paragraphs
            img[52:62, 8:24] += 0.85  # Notary advocate seal
            img[52:62, 40:56] += 0.85 # Deponent signature
        elif cat == 2: # Financial / Joint FDR: Strict tabular borders, bank watermark
            img[6:14, 8:56] += 0.7   # Bank banner
            img[18:48, 6:58:4] += 0.9 # Grid line rows
            img[18:48, 6:58:8] += 0.9 # Grid line columns
            img[50:58, 36:58] += 0.8 # Branch manager endorsement
        elif cat == 3: # Floor Plan / Architect Drawing: Outer boundary rect, internal rooms
            img[4:60, 4] += 0.95
            img[4:60, 60] += 0.95
            img[4, 4:60] += 0.95
            img[60, 4:60] += 0.95
            img[20:44, 20:44] += 0.6  # Inner lab partitions

        X[i] = np.clip(img, 0.0, 1.0)
    return torch.tensor(X), torch.tensor(y)

print("[*] Generating synthetic document layout maps (2,000 pages across 4 categories)...")
train_X, train_y = generate_layout_dataset(2000)

class LayoutDataset(Dataset):
    def __init__(self, x, y):
        self.x = x
        self.y = y
    def __len__(self):
        return len(self.y)
    def __getitem__(self, idx):
        return self.x[idx], self.y[idx]

dataset = LayoutDataset(train_X, train_y)
dataloader = DataLoader(dataset, batch_size=32, shuffle=True)

layout_model = DocumentLayoutCNN(num_classes=4).to(device)
criterion = nn.CrossEntropyLoss()
optimizer = optim.AdamW(layout_model.parameters(), lr=0.001, weight_decay=1e-4)

# Training loop on RTX 5060 GPU
epochs = 15
start_time = time.time()
print(f"[*] Training CNN on {device} ({epochs} epochs)...")

layout_model.train()
for epoch in range(1, epochs + 1):
    total_loss = 0.0
    correct = 0
    total = 0
    for batch_x, batch_y in dataloader:
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

    epoch_loss = total_loss / total
    epoch_acc = (correct / total) * 100
    if epoch % 3 == 0 or epoch == epochs:
        print(f"  Epoch [{epoch:02d}/{epochs:02d}] - Loss: {epoch_loss:.4f} | Accuracy: {epoch_acc:.2f}%")

gpu_train_time = time.time() - start_time
print(f"[OK] CNN Training completed in {gpu_train_time:.2f}s on {torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU'}")

# Save PyTorch Model Artifact
model_path = os.path.join(MODELS_DIR, "document_layout_cnn.pt")
torch.save(layout_model.state_dict(), model_path)
model_size_mb = os.path.getsize(model_path) / (1024 * 1024)
print(f"[OK] Saved PyTorch model: {model_path} ({model_size_mb:.2f} MB - Strict Budget: < 50 MB)")

# ==============================================================================
# MODEL 2: MACHINE LEARNING (Gradient Boosting) - Compliance Risk & Priority Scorer
# Evaluates multi-factor signals: Findings severity, contradiction count, OCR uncertainty,
# historical compliance rate, and days to deadline.
# ==============================================================================
print("\n" + "-" * 70)
print("[+] [2/2] Training Machine Learning Model: Compliance Risk Scorer (Gradient Boosting)")
print("-" * 70)

def generate_compliance_risk_dataset(n_samples=3000):
    # Features:
    # 0: critical_findings_count (0-5)
    # 1: major_findings_count (0-8)
    # 2: minor_findings_count (0-10)
    # 3: contradiction_count (0-6)
    # 4: ocr_uncertainty_score (0.0 to 1.0)
    # 5: days_to_statutory_deadline (1 to 90)
    # 6: institution_historical_compliance_ratio (0.5 to 1.0)
    # 7: requested_intake_tier (1: <=60, 2: 120, 3: 180, 4: 240+)

    X = np.zeros((n_samples, 8), dtype=np.float32)
    y = np.zeros((n_samples,), dtype=np.int64) # 0: Low Risk, 1: Moderate Risk, 2: High/Urgent Risk

    for i in range(n_samples):
        crit = np.random.choice([0, 1, 2, 3], p=[0.55, 0.25, 0.15, 0.05])
        major = np.random.choice([0, 1, 2, 3, 4], p=[0.40, 0.30, 0.15, 0.10, 0.05])
        minor = np.random.poisson(1.5)
        contra = np.random.choice([0, 1, 2], p=[0.70, 0.20, 0.10])
        ocr_unc = np.random.beta(1.5, 8.0) # Skewed toward low uncertainty
        days_left = np.random.randint(2, 90)
        hist_comp = np.random.uniform(0.65, 0.99)
        intake_tier = np.random.choice([1, 2, 3, 4])

        X[i] = [crit, major, minor, contra, ocr_unc, days_left, hist_comp, intake_tier]

        # Ground truth risk score formula
        risk_score = (
            crit * 35.0 +
            major * 18.0 +
            minor * 5.0 +
            contra * 20.0 +
            ocr_unc * 15.0 +
            max(0, (30 - days_left) * 0.8) -
            (hist_comp - 0.5) * 15.0
        )

        if risk_score > 45.0 or crit >= 1:
            y[i] = 2  # Urgent / High Risk
        elif risk_score > 20.0 or major >= 1:
            y[i] = 1  # Moderate Risk
        else:
            y[i] = 0  # Low Risk / Expedited

    return X, y

print("[*] Generating synthetic statutory compliance features (3,000 regulatory records)...")
X_risk, y_risk = generate_compliance_risk_dataset(3000)

ml_start_time = time.time()
print("[*] Training Gradient Boosting Risk Estimator...")
risk_clf = GradientBoostingClassifier(
    n_estimators=100,
    learning_rate=0.1,
    max_depth=4,
    random_state=42
)
risk_clf.fit(X_risk, y_risk)
ml_train_time = time.time() - ml_start_time

train_acc = risk_clf.score(X_risk, y_risk) * 100
print(f"[OK] GBDT Training completed in {ml_train_time:.2f}s | Train Accuracy: {train_acc:.2f}%")

# Save Scikit-Learn Model Artifact
ml_model_path = os.path.join(MODELS_DIR, "compliance_risk_gbdt.joblib")
joblib.dump(risk_clf, ml_model_path)
ml_size_mb = os.path.getsize(ml_model_path) / (1024 * 1024)
print(f"[OK] Saved ML model: {ml_model_path} ({ml_size_mb:.2f} MB)")

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
            "name": "DocumentLayoutCNN",
            "type": "Deep Learning (PyTorch CNN)",
            "classes": ["Certificate/NOC", "Sworn Affidavit", "Financial FDR", "Architectural Site Plan"],
            "parameters": sum(p.numel() for p in layout_model.parameters()),
            "artifactPath": "fastapi_engine/models/document_layout_cnn.pt",
            "sizeBytes": os.path.getsize(model_path),
            "sizeMB": round(model_size_mb, 2),
            "targetAccuracy": "99.8%"
        },
        {
            "name": "ComplianceRiskGBDT",
            "type": "Machine Learning (Gradient Boosting Decision Trees)",
            "classes": ["Low Risk (Expedited)", "Moderate Risk (Standard)", "High Risk (Urgent/Critical)"],
            "artifactPath": "fastapi_engine/models/compliance_risk_gbdt.joblib",
            "sizeBytes": os.path.getsize(ml_model_path),
            "sizeMB": round(ml_size_mb, 2),
            "trainAccuracy": f"{train_acc:.2f}%"
        }
    ],
    "budgetCompliance": {
        "totalModelBytes": os.path.getsize(model_path) + os.path.getsize(ml_model_path),
        "totalModelMB": round((os.path.getsize(model_path) + os.path.getsize(ml_model_path)) / (1024 * 1024), 2),
        "budgetCapMB": 50.0,
        "isUnderBudget": (os.path.getsize(model_path) + os.path.getsize(ml_model_path)) < (50 * 1024 * 1024)
    }
}

meta_path = os.path.join(MODELS_DIR, "models_metadata.json")
with open(meta_path, "w") as f:
    json.dump(metadata, f, indent=2)

print("\n" + "=" * 70)
print("[SUCCESS] ALL MODELS TRAINED & SAVED SUCCESSFULLY")
print(f"[*] Hardware Utilized: {metadata['hardware']['accelerator']}")
print(f"[*] Total Models Storage: {metadata['budgetCompliance']['totalModelMB']} MB / 50.0 MB Cap")
print("=" * 70)
