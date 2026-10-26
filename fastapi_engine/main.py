"""
TRACE 2.0 Document-AI, ChronoGraph, DeltaScan, RuleReplay, ReviewPilot & Proofline Engine
FastAPI Service providing internal document intelligence and deterministic regulatory verification.
"""

import os
import sys
os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

from fastapi import FastAPI, HTTPException, Query, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional

from .routers import chronograph, deltascan, rulereplay, reviewpilot, proofline, document_ai, system_ml, workflow

app = FastAPI(
    title="TRACE 2.0 Document-AI & Regulatory Intelligence Engine",
    version="2.0.0",
    description="Internal FastAPI service for Document-AI, ChronoGraph, DeltaScan, RuleReplay, ReviewPilot, and Proofline.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(document_ai.router, prefix="/document", tags=["Document AI"])
app.include_router(deltascan.router, prefix="/deltascan", tags=["DeltaScan"])
app.include_router(chronograph.router, prefix="/chronograph", tags=["ChronoGraph"])
app.include_router(rulereplay.router, prefix="/rulereplay", tags=["RuleReplay"])
app.include_router(reviewpilot.router, prefix="/reviewpilot", tags=["ReviewPilot"])
app.include_router(proofline.router, prefix="/proofline", tags=["Proofline"])
app.include_router(system_ml.router, prefix="/system_ml", tags=["System ML"])
app.include_router(workflow.router, prefix="/workflow", tags=["LangGraph Workflow & Qdrant VRAG/MRAG"])

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "TRACE 2.0 Document-AI Engine",
        "version": "2.0.0",
        "features": [
            "ChronoGraph: Cross-Document Contradiction Graph",
            "RuleReplay: Regulatory Change Impact Simulator",
            "DeltaScan: Incremental Document Reprocessing",
            "FixPreview: Counterfactual Sandbox",
            "ReviewPilot: Explainable Prioritization",
            "Proofline: Reproducible Lineage Manifests"
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("fastapi_engine.main:app", host="127.0.0.1", port=8000, reload=False)
