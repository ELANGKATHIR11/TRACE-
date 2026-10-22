import os
import re
from datetime import datetime
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter()

def parse_iso_date(text: str) -> Optional[datetime]:
    if not text:
        return None
    patterns = [
        r'(\d{4})[-/](\d{1,2})[-/](\d{1,2})',
        r'(\d{1,2})[-/](\d{1,2})[-/](\d{4})',
    ]
    for p in patterns:
        m = re.search(p, text)
        if m:
            parts = m.groups()
            try:
                if len(parts[0]) == 4:
                    return datetime(int(parts[0]), int(parts[1]), int(parts[2]))
                else:
                    return datetime(int(parts[2]), int(parts[1]), int(parts[0]))
            except ValueError:
                continue
    # Month word matches (e.g. 15 March 2026)
    month_match = re.search(r'(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,]+(\d{4})', text, re.I)
    if month_match:
        d, m_str, y = month_match.groups()
        months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"]
        m_idx = months.index(m_str.lower()[:3]) + 1
        return datetime(int(y), m_idx, int(d))
    return None

def normalize_area_sqm(raw_text: str) -> Optional[float]:
    """
    Deterministic normalization: converts Acres, Hectares, Sq Ft to Sq Meters.
    1 Acre = 4046.86 sq.m
    1 Hectare = 10000 sq.m
    1 Sq Ft = 0.092903 sq.m
    """
    m = re.search(r'([0-9,]+(?:\.[0-9]+)?)\s*(acres?|hectares?|sq\.?\s*m|sq\.?\s*ft|square\s*meters?)', raw_text, re.I)
    if not m:
        return None
    val = float(m.group(1).replace(',', ''))
    unit = m.group(2).lower()
    if 'acre' in unit:
        return round(val * 4046.86, 2)
    elif 'hectare' in unit:
        return round(val * 10000.0, 2)
    elif 'sq' in unit and 'ft' in unit:
        return round(val * 0.092903, 2)
    elif 'sq' in unit or 'meter' in unit:
        return round(val, 2)
    return round(val, 2)

class ExtractClaimsRequest(BaseModel):
    applicationId: str
    institutionId: str
    documents: List[Dict[str, Any]] # Each doc has id, title, version, category, pages, text

class ClaimItem(BaseModel):
    id: Optional[str] = None
    applicationId: str
    institutionId: str
    documentId: str
    documentTitle: str
    documentVersion: str = "v1.0"
    claimType: str
    claimKey: str
    rawValue: str
    normalizedValue: str
    pageNumber: int = 1
    boundingBoxId: Optional[str] = None
    confidence: float = 0.95
    relevantDate: Optional[str] = None
    timePeriod: Optional[str] = None
    ruleReferences: Optional[str] = None
    reviewStatus: str = "Unreviewed"

class ContradictionItem(BaseModel):
    sourceClaim: Dict[str, Any]
    targetClaim: Dict[str, Any]
    relationType: str
    severity: str
    explanation: str
    sourceValueSummary: str
    targetValueSummary: str
    status: str = "Open"
    sourceEvidenceDocTitle: str
    sourceEvidencePage: int
    targetEvidenceDocTitle: str
    targetEvidencePage: int

@router.post("/extract-claims")
def extract_claims(req: ExtractClaimsRequest):
    extracted_claims: List[Dict[str, Any]] = []

    for doc in req.documents:
        doc_id = doc.get("id", "")
        doc_title = doc.get("title", "")
        doc_ver = doc.get("version", "v1.0")
        doc_cat = doc.get("category", "")
        pages = doc.get("pages", [])

        # Accumulate text by page
        for p_idx, page in enumerate(pages):
            p_num = page.get("pageNumber", p_idx + 1)
            b_lines = page.get("bodyLines", [])
            p_text = " ".join(b_lines) if isinstance(b_lines, list) else str(b_lines)

            # 1. Fire / NOC Validity & Expiry Dates
            fire_m = re.search(r'(?:valid|expiry|validity|upto|till)\s*(?:up\s*to|date|period)?\s*[:\-]?\s*([0-9]{1,4}[-/\.][0-9]{1,2}[-/\.][0-9]{1,4}|[0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})', p_text, re.I)
            if fire_m:
                raw_d = fire_m.group(1)
                parsed_dt = parse_iso_date(raw_d)
                norm_d = parsed_dt.strftime("%Y-%m-%d") if parsed_dt else raw_d
                extracted_claims.append({
                    "applicationId": req.applicationId,
                    "institutionId": req.institutionId,
                    "documentId": doc_id,
                    "documentTitle": doc_title,
                    "documentVersion": doc_ver,
                    "claimType": "date",
                    "claimKey": "statutory_noc_validity_date",
                    "rawValue": raw_d,
                    "normalizedValue": norm_d,
                    "pageNumber": p_num,
                    "confidence": 0.98,
                    "relevantDate": norm_d,
                    "ruleReferences": "APH-2026-CL-4.2.b",
                    "reviewStatus": "Unreviewed"
                })

            # 2. Certificate / NOC Issue Date
            issue_m = re.search(r'(?:issue|issued|dated|order\s*date)\s*[:\-]?\s*([0-9]{1,4}[-/\.][0-9]{1,2}[-/\.][0-9]{1,4}|[0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})', p_text, re.I)
            if issue_m:
                raw_iss = issue_m.group(1)
                parsed_iss = parse_iso_date(raw_iss)
                norm_iss = parsed_iss.strftime("%Y-%m-%d") if parsed_iss else raw_iss
                extracted_claims.append({
                    "applicationId": req.applicationId,
                    "institutionId": req.institutionId,
                    "documentId": doc_id,
                    "documentTitle": doc_title,
                    "documentVersion": doc_ver,
                    "claimType": "date",
                    "claimKey": "document_issue_date",
                    "rawValue": raw_iss,
                    "normalizedValue": norm_iss,
                    "pageNumber": p_num,
                    "confidence": 0.96,
                    "relevantDate": norm_iss,
                    "ruleReferences": "APH-2026-CL-4.2.a",
                    "reviewStatus": "Unreviewed"
                })

            # 3. Land Area / Built-up Area
            area_m = re.search(r'([0-9,]+(?:\.[0-9]+)?)\s*(acres?|sq\.?\s*m|sq\.?\s*ft|hectares?|square\s*meters?)', p_text, re.I)
            if area_m:
                raw_a = area_m.group(0)
                norm_sqm = normalize_area_sqm(raw_a)
                extracted_claims.append({
                    "applicationId": req.applicationId,
                    "institutionId": req.institutionId,
                    "documentId": doc_id,
                    "documentTitle": doc_title,
                    "documentVersion": doc_ver,
                    "claimType": "area",
                    "claimKey": "total_site_area_sqm",
                    "rawValue": raw_a,
                    "normalizedValue": f"{norm_sqm} sq.m" if norm_sqm else raw_a,
                    "pageNumber": p_num,
                    "confidence": 0.95,
                    "ruleReferences": "APH-2026-CL-4.1.a",
                    "reviewStatus": "Unreviewed"
                })

            # 3b. Facility Completion / Commissioning / Handover Date
            comp_m = re.search(r'(?:completion|commissioned|commissioning|handover|possession|readiness)\s*(?:date|on)?\s*[:\-]?\s*([0-9]{1,4}[-/\.][0-9]{1,2}[-/\.][0-9]{1,4}|[0-9]{1,2}\s+[A-Za-z]+\s+[0-9]{4})', p_text, re.I)
            if comp_m:
                raw_c = comp_m.group(1)
                parsed_c = parse_iso_date(raw_c)
                norm_c = parsed_c.strftime("%Y-%m-%d") if parsed_c else raw_c
                extracted_claims.append({
                    "applicationId": req.applicationId,
                    "institutionId": req.institutionId,
                    "documentId": doc_id,
                    "documentTitle": doc_title,
                    "documentVersion": doc_ver,
                    "claimType": "date",
                    "claimKey": "facility_readiness_completion_date",
                    "rawValue": raw_c,
                    "normalizedValue": norm_c,
                    "pageNumber": p_num,
                    "confidence": 0.98,
                    "relevantDate": norm_c,
                    "ruleReferences": "APH-2026-CL-4.2.b",
                    "reviewStatus": "Unreviewed"
                })

            # 4. Approved / Sanctioned Intake Capacity
            intake_m = re.search(r'(?:intake|capacity|seats)\s*(?:of|is|sanctioned|approved)?\s*[:\-]?\s*([0-9]{2,4})', p_text, re.I)
            if intake_m:
                raw_i = intake_m.group(1)
                extracted_claims.append({
                    "applicationId": req.applicationId,
                    "institutionId": req.institutionId,
                    "documentId": doc_id,
                    "documentTitle": doc_title,
                    "documentVersion": doc_ver,
                    "claimType": "intake",
                    "claimKey": "approved_intake_capacity",
                    "rawValue": raw_i,
                    "normalizedValue": str(int(raw_i)),
                    "pageNumber": p_num,
                    "confidence": 0.93,
                    "ruleReferences": "APH-2026-CL-3.1",
                    "reviewStatus": "Unreviewed"
                })

            # 5. Statutory Registration / Certificate Number
            reg_m = re.search(r'(?:Certificate|Reg|NOC|Order|Reference)\s*(?:No\.?|Number|#)?\s*[:\-]?\s*([A-Za-z0-9\/\-_]{6,30})', p_text, re.I)
            if reg_m:
                cert_no = reg_m.group(1)
                extracted_claims.append({
                    "applicationId": req.applicationId,
                    "institutionId": req.institutionId,
                    "documentId": doc_id,
                    "documentTitle": doc_title,
                    "documentVersion": doc_ver,
                    "claimType": "identifier",
                    "claimKey": "statutory_reference_id",
                    "rawValue": cert_no,
                    "normalizedValue": cert_no.strip().upper(),
                    "pageNumber": p_num,
                    "confidence": 0.97,
                    "ruleReferences": "APH-2026-CL-1.4",
                    "reviewStatus": "Unreviewed"
                })

    return {"success": True, "claims": extracted_claims}

class DetectContradictionsRequest(BaseModel):
    applicationId: str
    academicYear: str = "2026-27"
    claims: List[Dict[str, Any]]

@router.post("/detect-contradictions")
def detect_contradictions(req: DetectContradictionsRequest):
    claims = req.claims
    contradictions: List[Dict[str, Any]] = []

    # Map claims by key
    claims_by_key: Dict[str, List[Dict[str, Any]]] = {}
    for c in claims:
        k = c.get("claimKey", "")
        if k not in claims_by_key:
            claims_by_key[k] = []
        claims_by_key[k].append(c)

    # 1. Check Site / Land Area Mismatches across documents
    area_claims = claims_by_key.get("total_site_area_sqm", [])
    if len(area_claims) >= 2:
        for i in range(len(area_claims)):
            for j in range(i + 1, len(area_claims)):
                c1 = area_claims[i]
                c2 = area_claims[j]
                if c1.get("documentId") != c2.get("documentId"):
                    # Extract numeric values
                    v1_m = re.search(r'([0-9]+(?:\.[0-9]+)?)', c1.get("normalizedValue", ""))
                    v2_m = re.search(r'([0-9]+(?:\.[0-9]+)?)', c2.get("normalizedValue", ""))
                    if v1_m and v2_m:
                        val1 = float(v1_m.group(1))
                        val2 = float(v2_m.group(1))
                        diff = abs(val1 - val2)
                        tolerance = max(val1, val2) * 0.05 # 5% statutory tolerance
                        if diff > tolerance:
                            contradictions.append({
                                "sourceClaim": c1,
                                "targetClaim": c2,
                                "relationType": "VALUE_MISMATCH",
                                "severity": "Critical" if diff > 500 else "Major",
                                "explanation": f"Document '{c1.get('documentTitle')}' specifies {val1:.1f} sq.m on Page {c1.get('pageNumber')}, while '{c2.get('documentTitle')}' asserts {val2:.1f} sq.m on Page {c2.get('pageNumber')}. Discrepancy of {diff:.1f} sq.m exceeds statutory 5% allowable margin. Physical survey verification advised.",
                                "sourceValueSummary": f"{c1.get('rawValue')} ({val1:.1f} sq.m)",
                                "targetValueSummary": f"{c2.get('rawValue')} ({val2:.1f} sq.m)",
                                "status": "Open",
                                "sourceEvidenceDocTitle": c1.get("documentTitle"),
                                "sourceEvidencePage": c1.get("pageNumber", 1),
                                "targetEvidenceDocTitle": c2.get("documentTitle"),
                                "targetEvidencePage": c2.get("pageNumber", 1)
                            })

    # 2. Check Temporal Inconsistencies & Stale/Expired NOCs
    noc_dates = claims_by_key.get("statutory_noc_validity_date", [])
    # Reference cutoff date for 2026-27 is 2026-06-30
    cutoff_dt = datetime(2026, 6, 30)

    for c in noc_dates:
        parsed_dt = parse_iso_date(c.get("normalizedValue", ""))
        if parsed_dt and parsed_dt < cutoff_dt:
            # Stale / Expired evidence contradiction against application academic cycle
            contradictions.append({
                "sourceClaim": c,
                "targetClaim": {
                    "documentTitle": f"AICTE Approval Cycle {req.academicYear}",
                    "pageNumber": 1,
                    "normalizedValue": "2026-06-30 (Academic Term Commencement)",
                    "claimKey": "academic_cycle_requirement"
                },
                "relationType": "STALE_EXPIRED",
                "severity": "Critical",
                "explanation": f"'{c.get('documentTitle')}' records validity expiry on {parsed_dt.strftime('%d-%b-%Y')} (Page {c.get('pageNumber')}), which lapses prior to the mandatory approval term {req.academicYear} (cutoff {cutoff_dt.strftime('%d-%b-%Y')}). A renewed statutory clearance or valid extension endorsement must be provided.",
                "sourceValueSummary": f"Expired {parsed_dt.strftime('%Y-%m-%d')}",
                "targetValueSummary": f"Mandatory Active through {req.academicYear}",
                "status": "Open",
                "sourceEvidenceDocTitle": c.get("documentTitle"),
                "sourceEvidencePage": c.get("pageNumber", 1),
                "targetEvidenceDocTitle": f"Statutory Handbook Cycle ({req.academicYear})",
                "targetEvidencePage": 1
            })

    # 3. Check Temporal ordering: Issue date after Expiry date or Sequence Anomalies
    issue_dates = claims_by_key.get("document_issue_date", [])
    for c_iss in issue_dates:
        dt_iss = parse_iso_date(c_iss.get("normalizedValue", ""))
        # Check against validity date in same document
        for c_exp in noc_dates:
            if c_iss.get("documentId") == c_exp.get("documentId"):
                dt_exp = parse_iso_date(c_exp.get("normalizedValue", ""))
                if dt_iss and dt_exp and dt_iss > dt_exp:
                    contradictions.append({
                        "sourceClaim": c_iss,
                        "targetClaim": c_exp,
                        "relationType": "TEMPORAL_CONTRADICTION",
                        "severity": "Critical",
                        "explanation": f"In '{c_iss.get('documentTitle')}', the recorded Issue Date ({dt_iss.strftime('%Y-%m-%d')}) is chronologically later than its Validity Expiry Date ({dt_exp.strftime('%Y-%m-%d')}). This indicates a typographical error or inconsistent date provenance requiring statutory clarification.",
                        "sourceValueSummary": f"Issue Date: {dt_iss.strftime('%Y-%m-%d')}",
                        "targetValueSummary": f"Expiry Date: {dt_exp.strftime('%Y-%m-%d')}",
                        "status": "Open",
                        "sourceEvidenceDocTitle": c_iss.get("documentTitle"),
                        "sourceEvidencePage": c_iss.get("pageNumber", 1),
                        "targetEvidenceDocTitle": c_exp.get("documentTitle"),
                        "targetEvidencePage": c_exp.get("pageNumber", 1)
                    })

    # 4. Check Intake Capacity Discrepancies
    intake_claims = claims_by_key.get("approved_intake_capacity", [])
    if len(intake_claims) >= 2:
        for i in range(len(intake_claims)):
            for j in range(i + 1, len(intake_claims)):
                c1 = intake_claims[i]
                c2 = intake_claims[j]
                if c1.get("documentId") != c2.get("documentId"):
                    if c1.get("normalizedValue") != c2.get("normalizedValue"):
                        contradictions.append({
                            "sourceClaim": c1,
                            "targetClaim": c2,
                            "relationType": "VALUE_MISMATCH",
                            "severity": "Major",
                            "explanation": f"'{c1.get('documentTitle')}' specifies an intake of {c1.get('normalizedValue')} seats, whereas '{c2.get('documentTitle')}' records {c2.get('normalizedValue')} seats. Clarification required regarding approved expansion vs sanctioned baseline.",
                            "sourceValueSummary": f"{c1.get('normalizedValue')} seats",
                            "targetValueSummary": f"{c2.get('normalizedValue')} seats",
                            "status": "Open",
                            "sourceEvidenceDocTitle": c1.get("documentTitle"),
                            "sourceEvidencePage": c1.get("pageNumber", 1),
                            "targetEvidenceDocTitle": c2.get("documentTitle"),
                            "targetEvidencePage": c2.get("pageNumber", 1)
                        })

    # 5. Check Facility Readiness / Completion Dates (Cutoff & Cross-Document Mismatches)
    comp_dates = claims_by_key.get("facility_readiness_completion_date", [])
    cutoff_dt = datetime(2026, 6, 30)

    for c in comp_dates:
        parsed_dt = parse_iso_date(c.get("normalizedValue", ""))
        if parsed_dt and parsed_dt > cutoff_dt:
            contradictions.append({
                "sourceClaim": c,
                "targetClaim": {
                    "documentTitle": f"AICTE Approval Cycle {req.academicYear} (APH-2026-CL-4.2.b)",
                    "pageNumber": 1,
                    "normalizedValue": "2026-06-30 (Mandatory Readiness Cutoff)",
                    "claimKey": "statutory_readiness_cutoff"
                },
                "relationType": "TEMPORAL_CONTRADICTION",
                "severity": "Critical",
                "explanation": f"'{c.get('documentTitle')}' records completion date {parsed_dt.strftime('%d-%b-%Y')} (Page {c.get('pageNumber')}), which post-dates the statutory deadline {cutoff_dt.strftime('%d-%b-%Y')} prescribed by Clause 4.2(b). Post-dated completion is deemed deficient.",
                "sourceValueSummary": f"Completion Date: {parsed_dt.strftime('%Y-%m-%d')}",
                "targetValueSummary": f"Mandatory Cutoff: {cutoff_dt.strftime('%Y-%m-%d')}",
                "status": "Open",
                "sourceEvidenceDocTitle": c.get("documentTitle"),
                "sourceEvidencePage": c.get("pageNumber", 1),
                "targetEvidenceDocTitle": f"AICTE APH ({req.academicYear})",
                "targetEvidencePage": 1
            })

    # Cross-document completion discrepancy (e.g. Structural Certificate vs Sworn Affidavit)
    if len(comp_dates) >= 2:
        for i in range(len(comp_dates)):
            for j in range(i + 1, len(comp_dates)):
                c1 = comp_dates[i]
                c2 = comp_dates[j]
                if c1.get("documentId") != c2.get("documentId") and c1.get("normalizedValue") != c2.get("normalizedValue"):
                    contradictions.append({
                        "sourceClaim": c1,
                        "targetClaim": c2,
                        "relationType": "TEMPORAL_CONTRADICTION",
                        "severity": "Critical",
                        "explanation": f"Cross-document inconsistency: '{c1.get('documentTitle')}' declares completion on {c1.get('normalizedValue')}, which directly contradicts '{c2.get('documentTitle')}' declaring commissioning on {c2.get('normalizedValue')}.",
                        "sourceValueSummary": f"{c1.get('normalizedValue')}",
                        "targetValueSummary": f"{c2.get('normalizedValue')}",
                        "status": "Open",
                        "sourceEvidenceDocTitle": c1.get("documentTitle"),
                        "sourceEvidencePage": c1.get("pageNumber", 1),
                        "targetEvidenceDocTitle": c2.get("documentTitle"),
                        "targetEvidencePage": c2.get("pageNumber", 1)
                    })

    return {
        "success": True,
        "applicationId": req.applicationId,
        "totalClaimsAnalyzed": len(claims),
        "contradictionsCount": len(contradictions),
        "contradictions": contradictions
    }
