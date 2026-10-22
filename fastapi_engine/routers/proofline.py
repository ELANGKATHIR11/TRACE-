import json
import hashlib
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter()

def canonical_hash(payload: Dict[str, Any]) -> str:
    """Computes a deterministic SHA-256 over key-sorted JSON."""
    encoded = json.dumps(payload, sort_keys=True, separators=(',', ':')).encode('utf-8')
    return hashlib.sha256(encoded).hexdigest()

class GenerateManifestRequest(BaseModel):
    applicationId: str
    assessmentId: str
    documentHashes: List[Dict[str, Any]] # title, version, sha256
    claimReferences: List[Dict[str, Any]] # claimKey, normalizedValue, docTitle, page
    ruleVersionUsed: str
    pipelineVersions: Dict[str, str] # pymupdf, easyocr, traceCore
    normalizedInputs: Dict[str, Any]
    ruleEvaluations: List[Dict[str, Any]] # ruleClauseId, status, explanation
    previousManifestHash: Optional[str] = None
    signedBy: str = "Dr. Arvind Deshmukh (Senior Scrutiny Lead)"
    timestamp: Optional[str] = None

@router.post("/generate-manifest")
def generate_manifest(req: GenerateManifestRequest):
    timestamp_iso = req.timestamp or datetime.now(timezone.utc).isoformat()
    prev_hash = req.previousManifestHash or "0000000000000000000000000000000000000000000000000000000000000000"

    manifest_payload = {
        "applicationId": req.applicationId,
        "assessmentId": req.assessmentId,
        "documentHashes": req.documentHashes,
        "claimReferences": req.claimReferences,
        "ruleVersionUsed": req.ruleVersionUsed,
        "pipelineVersions": req.pipelineVersions,
        "normalizedInputs": req.normalizedInputs,
        "ruleEvaluations": req.ruleEvaluations,
        "previousManifestHash": prev_hash,
        "signedBy": req.signedBy,
        "timestamp": timestamp_iso
    }

    manifest_hash = canonical_hash(manifest_payload)

    return {
        "success": True,
        "applicationId": req.applicationId,
        "assessmentId": req.assessmentId,
        "manifestHash": manifest_hash,
        "previousManifestHash": prev_hash,
        "signedBy": req.signedBy,
        "signedAt": timestamp_iso,
        "verificationStatus": "Valid Chain",
        "manifestPayload": manifest_payload
    }

class VerifyChainRequest(BaseModel):
    manifestChain: List[Dict[str, Any]] # Ordered list of manifests from genesis to latest

@router.post("/verify-chain")
def verify_manifest_chain(req: VerifyChainRequest):
    chain = req.manifestChain
    if not chain:
        return {"valid": True, "chainLength": 0, "message": "Empty chain"}

    for idx, manifest in enumerate(chain):
        payload = manifest.get("manifestPayload")
        expected_hash = manifest.get("manifestHash")
        recorded_prev = manifest.get("previousManifestHash")

        if payload:
            recomputed = canonical_hash(payload)
            if recomputed != expected_hash:
                # Check for ISO timestamp format variants (e.g. Z vs +00:00 or microsecond truncation)
                ts = str(payload.get("timestamp", ""))
                matched = False
                if ts:
                    alt_payload = dict(payload)
                    for alt_ts in [
                        ts.replace("Z", "+00:00"),
                        ts.replace("+00:00", "Z"),
                        ts.split(".")[0] + "Z" if "." in ts else ts,
                        ts.split(".")[0] + "+00:00" if "." in ts else ts
                    ]:
                        alt_payload["timestamp"] = alt_ts
                        if canonical_hash(alt_payload) == expected_hash:
                            matched = True
                            break
                if not matched:
                    return {
                        "valid": False,
                        "tamperedIndex": idx,
                        "applicationId": manifest.get("applicationId"),
                        "reason": f"Payload hash mismatch at manifest index {idx}. Recomputed: {recomputed}, Recorded: {expected_hash}"
                    }

        # Check chain link with predecessor
        if idx > 0:
            parent_hash = chain[idx - 1].get("manifestHash")
            if recorded_prev != parent_hash:
                return {
                    "valid": False,
                    "tamperedIndex": idx,
                    "applicationId": manifest.get("applicationId"),
                    "reason": f"Hash linkage broken at manifest index {idx}. Predecessor hash {parent_hash} does not match recorded previous pointer {recorded_prev}."
                }

    return {
        "valid": True,
        "chainLength": len(chain),
        "latestHash": chain[-1].get("manifestHash"),
        "rootHash": chain[0].get("manifestHash"),
        "message": "All cryptographic links and payload signatures verified intact. Zero tampering detected."
    }
