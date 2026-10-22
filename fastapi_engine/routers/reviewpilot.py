import math
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter()

class PrioritizeQueueRequest(BaseModel):
    applications: List[Dict[str, Any]]
    availableReviewers: Optional[List[Dict[str, Any]]] = None

@router.post("/prioritize")
def prioritize_review_queue(req: PrioritizeQueueRequest):
    """
    Deterministic explainable prioritization algorithm.
    Ranks items with transparent scoring factors and fair reviewer assignment.
    """
    scored_items: List[Dict[str, Any]] = []

    # Default mock reviewers if none provided
    reviewers = req.availableReviewers or [
        {"id": "USR-REV-01", "name": "Dr. Arvind Deshmukh", "activeWorkload": 2, "specialty": "Engineering & Technology"},
        {"id": "USR-REV-02", "name": "Prof. Sunita Rao", "activeWorkload": 1, "specialty": "Pharmacy & Architecture"},
        {"id": "USR-REV-03", "name": "Er. Rajesh Kulkarni", "activeWorkload": 3, "specialty": "Infrastructure & Safety"}
    ]

    for app in req.applications:
        app_id = app.get("id")
        app_code = app.get("code")
        findings = app.get("findings", [])
        contradictions = app.get("contradictions", [])
        docs = app.get("documents", [])
        obligations = app.get("obligations", [])
        submitted_at = app.get("submittedAt")

        # 1. Finding Severity Score (Max 45 pts)
        crit_count = sum(1 for f in findings if f.get("severity") == "Critical" and f.get("lifecycleStatus") != "Resolved")
        major_count = sum(1 for f in findings if f.get("severity") == "Major" and f.get("lifecycleStatus") != "Resolved")
        mod_count = sum(1 for f in findings if f.get("severity") == "Moderate" and f.get("lifecycleStatus") != "Resolved")
        findings_score = min(crit_count * 25.0 + major_count * 12.0 + mod_count * 5.0, 45.0)

        # 2. Contradiction Score (Max 25 pts)
        open_contradictions = [c for c in contradictions if c.get("status", "Open") == "Open"]
        crit_contra = sum(1 for c in open_contradictions if c.get("severity") == "Critical")
        maj_contra = sum(1 for c in open_contradictions if c.get("severity") == "Major")
        contra_score = min(crit_contra * 15.0 + maj_contra * 8.0, 25.0)

        # 3. Model / Extraction Uncertainty (Max 15 pts)
        # Low OCR confidence raises priority for human inspection
        avg_ocr = 95.0
        if docs:
            confidences = [d.get("ocrConfidenceAvg", 95.0) for d in docs if d.get("ocrConfidenceAvg") is not None]
            if confidences:
                avg_ocr = sum(confidences) / len(confidences)
        uncertainty_score = 0.0
        if avg_ocr < 80.0:
            uncertainty_score = 15.0
        elif avg_ocr < 90.0:
            uncertainty_score = 10.0
        elif avg_ocr < 95.0:
            uncertainty_score = 5.0

        # 4. Deadline / Statutory Time Proximity (Max 15 pts)
        # Check upcoming obligations
        deadline_score = 5.0
        for ob in obligations:
            if ob.get("status") in ["Awaiting evidence", "Overdue", "Upcoming"]:
                deadline_score = 15.0 if ob.get("status") == "Overdue" else 10.0
                break

        # Total Composite Priority Score (0 to 100)
        total_score = round(findings_score + contra_score + uncertainty_score + deadline_score, 1)

        # Urgency Band
        if total_score >= 60.0:
            urgency_band = "Immediate"
        elif total_score >= 40.0:
            urgency_band = "High"
        elif total_score >= 20.0:
            urgency_band = "Normal"
        else:
            urgency_band = "Low"

        # Structured explanation factors
        explanation_factors = {
            "findingSeverity": {
                "score": findings_score,
                "unresolvedCritical": crit_count,
                "unresolvedMajor": major_count,
                "weightMax": 45
            },
            "contradictionImpact": {
                "score": contra_score,
                "activeContradictions": len(open_contradictions),
                "weightMax": 25
            },
            "extractionUncertainty": {
                "score": uncertainty_score,
                "averageConfidence": round(avg_ocr, 1),
                "weightMax": 15
            },
            "deadlineProximity": {
                "score": deadline_score,
                "weightMax": 15
            }
        }

        explanation_parts = []
        if crit_count > 0:
            explanation_parts.append(f"{crit_count} unresolved critical statutory finding(s)")
        if len(open_contradictions) > 0:
            explanation_parts.append(f"{len(open_contradictions)} cross-document contradiction(s)")
        if avg_ocr < 90.0:
            explanation_parts.append(f"lower OCR confidence ({avg_ocr:.1f}%) necessitating human verification")
        if deadline_score >= 10.0:
            explanation_parts.append("approaching statutory scrutiny deadline")

        explanation_text = "Prioritized due to: " + ("; ".join(explanation_parts) if explanation_parts else "Standard queue progression.")

        scored_items.append({
            "applicationId": app_id,
            "applicationCode": app_code,
            "programName": app.get("programName"),
            "currentStage": app.get("currentStage"),
            "priorityScore": total_score,
            "urgencyBand": urgency_band,
            "scoringFactors": explanation_factors,
            "explanationText": explanation_text
        })

    # Sort deterministically: highest priorityScore first, with stable tie-breaking on applicationCode
    scored_items.sort(key=lambda x: (-x["priorityScore"], x["applicationCode"]))

    # Fair reviewer assignment based on least loaded reviewer
    reviewer_pool = sorted(reviewers, key=lambda r: r.get("activeWorkload", 0))
    for idx, item in enumerate(scored_items):
        item["rank"] = idx + 1
        assigned_rev = reviewer_pool[idx % len(reviewer_pool)]
        item["assignedReviewerId"] = assigned_rev["id"]
        item["assignedReviewerName"] = assigned_rev["name"]
        item["reviewerWorkload"] = assigned_rev["activeWorkload"]

    return {
        "success": True,
        "totalApplicationsPrioritized": len(scored_items),
        "scoringMethodology": "Deterministic Multi-Factor Regulatory Policy (Deficiencies + Contradictions + OCR Uncertainty + Deadlines)",
        "items": scored_items
    }
