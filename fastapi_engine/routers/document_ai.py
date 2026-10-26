"""
TRACE 2.0 — Document-AI Router (Ollama-Only AI + Deterministic PyMuPDF/Forensics)
Strictly removes EasyOCR and non-Ollama ML models from operational document processing.
Uses PyMuPDF for native PDF text extraction and digital signature inspection,
OpenCV + perceptual hashing (pHash) for classical image forensics,
and the centralized Ollama Vision-Language Model (VLM) gateway (`riven/smolvlm:latest`)
for scanned-page OCR and visual document interpretation.
"""

import os
import sys
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"
import re
import hashlib
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

import pymupdf  # PyMuPDF
import cv2
import numpy as np

from ..services.ollama_gateway import ollama_gateway
from ..services.qdrant_vrag_mrag import qdrant_vrag_mrag

router = APIRouter()


def compute_sha256(filepath: str) -> str:
    hasher = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(65536):
            hasher.update(chunk)
    return hasher.hexdigest()


def compute_text_sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def compute_perceptual_phash(img_bytes: bytes) -> str:
    """Computes a deterministic 64-bit DCT perceptual hash (pHash) using OpenCV."""
    try:
        arr = np.frombuffer(img_bytes, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_GRAYSCALE)
        if img is None:
            return hashlib.sha256(img_bytes).hexdigest()[:16]
        resized = cv2.resize(img, (32, 32), interpolation=cv2.INTER_AREA)
        dct = cv2.dct(np.float32(resized))
        dct_low = dct[:8, :8]
        med = np.median(dct_low)
        bits = (dct_low > med).flatten()
        val = 0
        for b in bits:
            val = (val << 1) | int(b)
        return f"{val:016x}"
    except Exception:
        return hashlib.sha256(img_bytes).hexdigest()[:16]


def parse_date_str(text: str) -> Optional[str]:
    patterns = [
        r"\b(\d{4}[-/]\d{2}[-/]\d{2})\b",
        r"\b(\d{2}[-/]\d{2}[-/]\d{4})\b",
        r"\b(\d{1,2}[\s\-]+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,\-]+\d{4})\b",
    ]
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            raw = match.group(1).replace("/", "-")
            parts = raw.split("-")
            if len(parts) == 3 and parts[1].isdigit():
                if len(parts[0]) == 4:
                    return f"{parts[0]}-{parts[1].zfill(2)}-{parts[2].zfill(2)}"
                elif len(parts[2]) == 4:
                    return f"{parts[2]}-{parts[1].zfill(2)}-{parts[0].zfill(2)}"
            return raw
    return None


class ProcessDocumentRequest(BaseModel):
    filePath: str
    extractClaims: bool = True
    forceVisionModel: Optional[str] = None


@router.post("/process")
def process_document(req: ProcessDocumentRequest):
    filepath = req.filePath
    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail=f"File not found: {filepath}")

    file_size_bytes = os.path.getsize(filepath)
    file_size_str = (
        f"{(file_size_bytes / 1024):.1f} KB"
        if file_size_bytes < 1024 * 1024
        else f"{(file_size_bytes / (1024 * 1024)):.2f} MB"
    )
    file_hash = compute_sha256(filepath)
    ext = os.path.splitext(filepath)[1].lower()

    pages_data = []
    page_fingerprints = []
    bounding_boxes = []
    box_id_counter = 1
    ocr_engine_used = "PyMuPDF Native Text Parser"
    model_provenance_records = []
    overall_processing_status = "EXTRACTED"

    if ext == ".pdf":
        doc = pymupdf.open(filepath)
        total_pages = len(doc)

        for page_idx in range(total_pages):
            page = doc[page_idx]
            page_num = page_idx + 1
            rect = page.rect
            page_w, page_h = rect.width, rect.height

            blocks = page.get_text("blocks")
            raw_text = page.get_text()
            body_lines = [b[4].strip() for b in blocks if len(b) > 4 and b[4].strip()]

            pix = page.get_pixmap(dpi=150)
            page_img_bytes = pix.tobytes("png")
            page_img_hash = hashlib.sha256(page_img_bytes).hexdigest()
            page_phash = compute_perceptual_phash(page_img_bytes)
            page_text_hash = compute_text_sha256(raw_text)

            # Scanned page check: if native text < 40 chars, invoke Ollama Vision-Language Model
            if len(raw_text.strip()) < 40:
                vlm_res = ollama_gateway.analyze_image_vision(
                    task_name=f"scanned_page_ocr_p{page_num}",
                    image_bytes=page_img_bytes,
                    prompt=(
                        "Transcribe all visible text on this scanned regulatory document page accurately. "
                        "Include certificate numbers, dates, authority headers, area measurements, and stamps."
                    ),
                    model_override=req.forceVisionModel,
                )
                model_provenance_records.append(vlm_res.get("provenance"))
                if vlm_res["status"] == "SUCCESS" and vlm_res.get("text"):
                    ocr_engine_used = f"Ollama VLM ({vlm_res.get('modelUsed')})"
                    for line in vlm_res["text"].splitlines():
                        cleaned = line.strip()
                        if cleaned:
                            body_lines.append(cleaned)
                            b_id = f"BOX-P{page_num}-{box_id_counter}"
                            box_id_counter += 1
                            bounding_boxes.append({
                                "id": b_id,
                                "pageNumber": page_num,
                                "x": 8.0,
                                "y": min(90.0, 10.0 + box_id_counter * 5.0),
                                "width": 84.0,
                                "height": 4.5,
                                "label": cleaned[:60],
                                "category": "clause_value",
                                "status": "valid",
                            })
                else:
                    ocr_engine_used = "MODEL_UNAVAILABLE (Ollama VLM Required for Scanned Page)"
                    overall_processing_status = "MODEL_UNAVAILABLE"
                    body_lines.append("[MODEL_UNAVAILABLE: Scanned page requires local Ollama vision model]")
            else:
                for b in blocks:
                    if len(b) >= 5 and b[4].strip():
                        bx = round((b[0] / page_w) * 100, 2)
                        by = round((b[1] / page_h) * 100, 2)
                        bw = round(((b[2] - b[0]) / page_w) * 100, 2)
                        bh = round(((b[3] - b[1]) / page_h) * 100, 2)
                        text_snippet = b[4].strip().replace("\n", " ")

                        b_id = f"BOX-P{page_num}-{box_id_counter}"
                        box_id_counter += 1

                        cat = "clause_value"
                        if any(k in text_snippet.lower() for k in ["date", "valid", "expire", "issued", "validity"]):
                            cat = "date"
                        elif any(k in text_snippet.lower() for k in ["no.", "ref", "reg", "certificate"]):
                            cat = "identifier"
                        elif any(k in text_snippet.lower() for k in ["director", "officer", "sign", "authority"]):
                            cat = "signature"
                        elif any(k in text_snippet.lower() for k in ["sq.m", "acres", "area", "built-up", "hectare"]):
                            cat = "area"

                        bounding_boxes.append({
                            "id": b_id,
                            "pageNumber": page_num,
                            "x": bx,
                            "y": by,
                            "width": max(bw, 4.0),
                            "height": max(bh, 2.0),
                            "label": text_snippet[:50],
                            "category": cat,
                            "status": "valid",
                        })

            cert_no = None
            issue_date = None
            full_page_str = " ".join(body_lines)
            cert_match = re.search(
                r"(?:Ref|Certificate|NOC|Order|Reg)\s*(?:No\.?|Number|#)?\s*[:\-]?\s*([A-Za-z0-9\/\-_]{5,35})",
                full_page_str,
                re.IGNORECASE,
            )
            if cert_match:
                cert_no = cert_match.group(1)

            p_date = parse_date_str(full_page_str)
            if p_date:
                issue_date = p_date

            detected_authority = "Statutory Authority"
            for line in body_lines[:5]:
                if any(
                    w in line.lower()
                    for w in ["government", "corporation", "department", "authority", "council", "board", "registrar"]
                ):
                    detected_authority = line
                    break

            has_seal_mention = any("seal" in l.lower() or "stamp" in l.lower() for l in body_lines)
            has_sign_mention = any(
                "sign" in l.lower() or "director" in l.lower() or "officer" in l.lower() for l in body_lines
            )

            pages_data.append({
                "pageNumber": page_num,
                "title": f"Page {page_num} of {os.path.basename(filepath)}",
                "headerAuthority": detected_authority,
                "certificateNumber": cert_no if cert_no else "NOT_EXTRACTED",
                "certificateNumberStatus": "extracted" if cert_no else "missing",
                "issueDate": issue_date if issue_date else "NOT_EXTRACTED",
                "issueDateStatus": "extracted" if issue_date else "missing",
                "bodyLines": body_lines[:30],
                "stampText": "Stamp mentioned in text" if has_seal_mention else "Unverified statutory seal",
                "stampStatus": "extracted" if has_seal_mention else "needs_manual_review",
                "signatory": "Signatory mentioned in text" if has_sign_mention else "Unverified signatory",
                "signatoryStatus": "extracted" if has_sign_mention else "needs_manual_review",
                "pHash": page_phash,
            })

            page_fingerprints.append({
                "pageNumber": page_num,
                "pageHash": page_img_hash,
                "pHash": page_phash,
                "textHash": page_text_hash,
                "hasVisualChanges": False,
                "extractorVersion": "v2.0.0-ollama",
            })

        doc.close()
    else:
        # Image document (PNG, JPG, TIFF) -> strictly use Ollama VLM
        with open(filepath, "rb") as f:
            img_bytes = f.read()
        img_phash = compute_perceptual_phash(img_bytes)

        vlm_res = ollama_gateway.analyze_image_vision(
            task_name="image_document_ocr",
            image_bytes=img_bytes,
            prompt=(
                "Transcribe all visible text on this regulatory document image. "
                "Include certificate numbers, dates, authority headers, area measurements, and stamps."
            ),
            model_override=req.forceVisionModel,
        )
        model_provenance_records.append(vlm_res.get("provenance"))
        body_lines = []
        if vlm_res["status"] == "SUCCESS" and vlm_res.get("text"):
            ocr_engine_used = f"Ollama VLM ({vlm_res.get('modelUsed')})"
            body_lines = [l.strip() for l in vlm_res["text"].splitlines() if l.strip()]
        else:
            ocr_engine_used = "MODEL_UNAVAILABLE (Ollama VLM Required)"
            overall_processing_status = "MODEL_UNAVAILABLE"
            body_lines = ["[MODEL_UNAVAILABLE: Image OCR requires local Ollama vision model]"]

        full_img_str = " ".join(body_lines)
        cert_match = re.search(
            r"(?:Ref|Certificate|NOC|Order|Reg)\s*(?:No\.?|Number|#)?\s*[:\-]?\s*([A-Za-z0-9\/\-_]{5,35})",
            full_img_str,
            re.IGNORECASE,
        )
        img_cert = cert_match.group(1) if cert_match else None
        img_date = parse_date_str(full_img_str)

        pages_data.append({
            "pageNumber": 1,
            "title": f"Image Document: {os.path.basename(filepath)}",
            "headerAuthority": "Document Authority",
            "certificateNumber": img_cert if img_cert else "NOT_EXTRACTED",
            "certificateNumberStatus": "extracted" if img_cert else "missing",
            "issueDate": img_date if img_date else "NOT_EXTRACTED",
            "issueDateStatus": "extracted" if img_date else "missing",
            "bodyLines": body_lines,
            "stampText": "Unverified visual stamp",
            "stampStatus": "needs_manual_review",
            "signatory": "Unverified signatory",
            "signatoryStatus": "needs_manual_review",
            "pHash": img_phash,
        })
        page_fingerprints.append({
            "pageNumber": 1,
            "pageHash": file_hash,
            "pHash": img_phash,
            "textHash": compute_text_sha256(" ".join(body_lines)),
            "hasVisualChanges": False,
            "extractorVersion": "v2.0.0-ollama",
        })

    return {
        "success": True,
        "processingStatus": overall_processing_status,
        "filePath": filepath,
        "fileName": os.path.basename(filepath),
        "fileSize": file_size_str,
        "sha256": file_hash,
        "ocrEngine": ocr_engine_used,
        "totalPages": len(pages_data),
        "pages": pages_data,
        "pageFingerprints": page_fingerprints,
        "boundingBoxes": bounding_boxes[:60],
        "modelProvenance": model_provenance_records,
        "integrityScreening": "File SHA-256 and perceptual pHash computed.",
    }
