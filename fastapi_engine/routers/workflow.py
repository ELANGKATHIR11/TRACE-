"""
TRACE 2.0 — FastAPI Router for LangGraph Supervisor–Worker Workflow & Qdrant VRAG/MRAG
"""

from typing import Dict, Any, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ..services.langgraph_workflow import langgraph_orchestrator
from ..services.qdrant_vrag_mrag import qdrant_vrag_mrag
from ..services.ollama_gateway import ollama_gateway

router = APIRouter()


class ExecuteWorkflowRequest(BaseModel):
    applicationId: str
    applicationCode: Optional[str] = None
    runId: Optional[str] = "latest"
    threadId: Optional[str] = None
    institutionId: str = "INST-01"
    institutionName: str = "Deccan Institute of Technology & Engineering"
    category: str = "Extension of Approval (EoA)"
    academicYear: str = "2026-27"
    programName: str = "B.Tech — Computer Science & Engineering (AI & Data Engineering)"
    requestedIntake: int = 180
    currentIntake: int = 120
    checklistVersion: str = "APH-2026-27-v2.0"
    ruleSetId: str = "RS-APH-2026-V2"
    authorizedRecordSnapshot: Dict[str, Any] = Field(default_factory=dict)
    priorHistoryRecords: List[Dict[str, Any]] = Field(default_factory=list)
    documents: List[Dict[str, Any]] = Field(default_factory=list)
    regulatoryClauses: List[Dict[str, Any]] = Field(default_factory=list)


class ResumeWorkflowRequest(BaseModel):
    threadId: str
    reviewerId: str
    reviewerName: str
    reviewerRole: str
    decision: str
    rationale: str


class HybridSearchRequest(BaseModel):
    query: str
    institutionId: Optional[str] = None
    applicationId: Optional[str] = None
    collections: Optional[List[str]] = None
    topK: int = 8


class IndexDocumentVragRequest(BaseModel):
    documentId: str
    applicationId: str
    institutionId: str
    title: str
    version: str = "v1.0"
    filePath: Optional[str] = None
    pages: List[Dict[str, Any]] = Field(default_factory=list)
    runVlmOnPages: bool = True


class IndexClausesRequest(BaseModel):
    clauses: List[Dict[str, Any]]


class IndexAuthorizedRecordsRequest(BaseModel):
    records: List[Dict[str, Any]]


@router.post("/execute")
def execute_langgraph_workflow(req: ExecuteWorkflowRequest):
    """Runs the 8-node LangGraph multi-agent supervisor-worker verification workflow with PostgreSQL checkpoints."""
    return langgraph_orchestrator.execute_workflow(req.model_dump())


@router.get("/state/{thread_id}")
def get_workflow_checkpoint_state(thread_id: str):
    """Retrieves the durable LangGraph checkpoint state for a thread_id."""
    return langgraph_orchestrator.get_checkpoint_state(thread_id)


@router.post("/resume")
def resume_workflow_human_review(req: ResumeWorkflowRequest):
    """Resumes a paused LangGraph human-review interrupt with an authorized reviewer's decision."""
    res = langgraph_orchestrator.resume_human_review(
        thread_id=req.threadId,
        reviewer_id=req.reviewerId,
        reviewer_name=req.reviewerName,
        reviewer_role=req.reviewerRole,
        decision=req.decision,
        rationale=req.rationale,
    )
    if not res.get("success"):
        raise HTTPException(status_code=404, detail=res.get("error", "Checkpoint not found"))
    return res


@router.get("/vrag_mrag/status")
def get_qdrant_vrag_mrag_status():
    """Returns Qdrant local persistent vector store and VRAG/MRAG status."""
    return qdrant_vrag_mrag.get_status()


@router.post("/vrag_mrag/search")
def search_vrag_mrag(req: HybridSearchRequest):
    """Executes hybrid Qdrant + lexical/identifier/clause retrieval with tenant isolation and RRF."""
    return qdrant_vrag_mrag.hybrid_retrieve(
        query=req.query,
        institution_id=req.institutionId,
        application_id=req.applicationId,
        collections=req.collections,
        top_k=req.topK,
    )


@router.post("/vrag_mrag/index-document")
def index_document_vrag_mrag(req: IndexDocumentVragRequest):
    """Indexes a document into both document_text_chunks (MRAG) and visual_page_descriptions (VRAG)."""
    return qdrant_vrag_mrag.index_document_vrag_and_mrag(
        document_id=req.documentId,
        application_id=req.applicationId,
        institution_id=req.institutionId,
        title=req.title,
        version=req.version,
        file_path=req.filePath,
        pages=req.pages,
        run_vlm_on_pages=req.runVlmOnPages,
    )


@router.post("/vrag_mrag/index-clauses")
def index_regulatory_clauses_endpoint(req: IndexClausesRequest):
    """Indexes regulatory handbook clauses into regulatory_chunks."""
    return qdrant_vrag_mrag.index_regulatory_clauses(req.clauses)


@router.post("/vrag_mrag/index-authorized-records")
def index_authorized_records_endpoint(req: IndexAuthorizedRecordsRequest):
    """Indexes authorized institutional records into authorized_record_summaries."""
    return qdrant_vrag_mrag.index_authorized_record_summaries(req.records)
