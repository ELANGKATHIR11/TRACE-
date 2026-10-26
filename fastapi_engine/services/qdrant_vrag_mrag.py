"""
TRACE 2.0 — VRAG (Visual Retrieval-Augmented Generation) & MRAG (Multimodal RAG)
with Local Persistent Qdrant Storage (No Docker).

Collections:
1. regulatory_chunks
2. document_text_chunks
3. visual_page_descriptions
4. authorized_record_summaries

Enforces strict tenant/role isolation by institutionId and applicationId,
tracks embedding model provenance, and performs Reciprocal Rank Fusion (RRF)
across dense Qdrant vector search (when an Ollama embedding model is active)
and exact lexical / BM25-style keyword + clause-number + identifier matching.
"""

import os
import re
import uuid
import json
import hashlib
import math
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

import pymupdf  # PyMuPDF

try:
    from qdrant_client import QdrantClient
    from qdrant_client.models import (
        Distance,
        VectorParams,
        PointStruct,
        Filter,
        FieldCondition,
        MatchValue,
    )
    QDRANT_AVAILABLE = True
except Exception:
    QDRANT_AVAILABLE = False

from .ollama_gateway import ollama_gateway

ROOT_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
QDRANT_STORAGE_PATH = os.path.join(ROOT_DIR, "qdrant_storage")
RENDERED_PAGES_DIR = os.path.join(ROOT_DIR, "uploads", "rendered_pages")

COLLECTION_NAMES = [
    "regulatory_chunks",
    "document_text_chunks",
    "visual_page_descriptions",
    "authorized_record_summaries",
]


class VisualPageDescriptionSchema(BaseModel):
    documentType: str = Field(default="Regulatory Document")
    visibleHeadings: List[str] = Field(default_factory=list)
    visibleTextSummary: str = Field(default="")
    tablesSummary: str = Field(default="None detected")
    sealsAndSignatures: str = Field(default="Unverified")
    datesAndIdentifiers: List[str] = Field(default_factory=list)
    visualQualityAndAnomalies: str = Field(default="Clear scan")


class QdrantVragMragEngine:
    def __init__(self, storage_path: str = QDRANT_STORAGE_PATH):
        self.storage_path = storage_path
        os.makedirs(self.storage_path, exist_ok=True)
        os.makedirs(RENDERED_PAGES_DIR, exist_ok=True)
        self._client: Optional[Any] = None
        # Also maintain a persistent JSON metadata mirror inside qdrant_storage/payload_store.json
        # so exact keyword/clause/identifier search and collection inspection work seamlessly
        # even when Ollama dense embeddings are in MODEL_UNAVAILABLE state.
        self._payload_mirror_path = os.path.join(self.storage_path, "payload_mirror.json")
        self._payload_store: Dict[str, List[Dict[str, Any]]] = self._load_payload_mirror()
        self._init_qdrant()

    def _load_payload_mirror(self) -> Dict[str, List[Dict[str, Any]]]:
        base = {c: [] for c in COLLECTION_NAMES}
        if os.path.exists(self._payload_mirror_path):
            try:
                with open(self._payload_mirror_path, "r", encoding="utf-8") as f:
                    loaded = json.load(f)
                    for c in COLLECTION_NAMES:
                        if c in loaded and isinstance(loaded[c], list):
                            base[c] = loaded[c]
            except Exception:
                pass
        return base

    def _save_payload_mirror(self) -> None:
        try:
            with open(self._payload_mirror_path, "w", encoding="utf-8") as f:
                json.dump(self._payload_store, f, indent=2)
        except Exception:
            pass

    def _init_qdrant(self, vector_dim: int = 768) -> None:
        if not QDRANT_AVAILABLE:
            return
        try:
            if self._client is None:
                self._client = QdrantClient(path=self.storage_path)
            existing = [c.name for c in self._client.get_collections().collections]
            for col in COLLECTION_NAMES:
                if col not in existing:
                    self._client.create_collection(
                        collection_name=col,
                        vectors_config=VectorParams(size=vector_dim, distance=Distance.COSINE),
                    )
        except Exception:
            pass

    def _ensure_collection_dim(self, col: str, dim: int) -> None:
        if not self._client or dim <= 0:
            return
        try:
            info = self._client.get_collection(col)
            current_size = info.config.params.vectors.size
            if current_size != dim:
                self._client.recreate_collection(
                    collection_name=col,
                    vectors_config=VectorParams(size=dim, distance=Distance.COSINE),
                )
        except Exception:
            try:
                self._client.create_collection(
                    collection_name=col,
                    vectors_config=VectorParams(size=dim, distance=Distance.COSINE),
                )
            except Exception:
                pass

    def get_status(self) -> Dict[str, Any]:
        gw_status = ollama_gateway.discover_models()
        embed_status = gw_status.embeddingStatus
        vision_status = gw_status.visionStatus
        collections_summary: Dict[str, Any] = {}

        for col in COLLECTION_NAMES:
            qdrant_points = 0
            if self._client:
                try:
                    info = self._client.get_collection(col)
                    qdrant_points = info.points_count or 0
                except Exception:
                    qdrant_points = 0
            mirror_items = len(self._payload_store.get(col, []))
            collections_summary[col] = {
                "collectionName": col,
                "denseVectorPoints": qdrant_points,
                "indexedRecordsCount": max(qdrant_points, mirror_items),
                "embeddingModel": embed_status.get("activeModel") or "MODEL_UNAVAILABLE (Lexical + Metadata Hybrid Active)",
                "denseVectorsAvailable": bool(embed_status.get("available")),
            }

        return {
            "qdrantAvailable": QDRANT_AVAILABLE and self._client is not None,
            "storagePath": self.storage_path,
            "renderedPagesDir": RENDERED_PAGES_DIR,
            "vragVisionModel": vision_status.get("activeModel"),
            "vragVisionAvailable": vision_status.get("available", False),
            "mragDenseEmbeddingModel": embed_status.get("activeModel"),
            "mragDenseEmbeddingAvailable": embed_status.get("available", False),
            "embeddingBlocker": None if embed_status.get("available") else embed_status,
            "collections": collections_summary,
            "checkedAt": datetime.now(timezone.utc).isoformat(),
        }

    def _upsert_item(
        self,
        collection_name: str,
        record_id: str,
        text_for_embedding: str,
        payload: Dict[str, Any],
    ) -> Dict[str, Any]:
        point_uuid = str(uuid.uuid5(uuid.NAMESPACE_OID, f"{collection_name}:{record_id}"))
        payload_with_meta = {
            **payload,
            "recordId": record_id,
            "pointUuid": point_uuid,
            "indexedText": text_for_embedding,
            "indexedAt": datetime.now(timezone.utc).isoformat(),
        }

        # 1. Update persistent payload mirror (for hybrid lexical/identifier/clause filtering)
        existing_list = self._payload_store.get(collection_name, [])
        existing_list = [x for x in existing_list if x.get("recordId") != record_id]
        existing_list.append(payload_with_meta)
        self._payload_store[collection_name] = existing_list
        self._save_payload_mirror()

        # 2. Attempt Ollama dense embedding if available
        emb_res = ollama_gateway.embed_texts([text_for_embedding], task_name=f"qdrant_index_{collection_name}")
        dense_indexed = False
        if emb_res["status"] == "SUCCESS" and emb_res.get("embeddings") and self._client:
            vec = emb_res["embeddings"][0]
            dim = len(vec)
            self._ensure_collection_dim(collection_name, dim)
            payload_with_meta["embeddingModel"] = emb_res.get("modelUsed")
            payload_with_meta["vectorDim"] = dim
            self._client.upsert(
                collection_name=collection_name,
                points=[
                    PointStruct(
                        id=point_uuid,
                        vector=vec,
                        payload=payload_with_meta,
                    )
                ],
            )
            dense_indexed = True

        return {
            "collection": collection_name,
            "recordId": record_id,
            "pointUuid": point_uuid,
            "denseVectorIndexed": dense_indexed,
            "embeddingStatus": emb_res["status"],
            "provenance": emb_res.get("provenance"),
        }

    def index_regulatory_clauses(self, clauses: List[Dict[str, Any]]) -> Dict[str, Any]:
        results = []
        for c in clauses:
            cid = c.get("id") or c.get("clauseNumber") or str(uuid.uuid4())
            text = (
                f"Clause {c.get('clauseNumber', '')} — {c.get('title', '')}. "
                f"Category: {c.get('category', '')}. "
                f"Excerpt: {c.get('excerpt', '')}. "
                f"Full Text: {c.get('fullText', '')}"
            )
            res = self._upsert_item(
                collection_name="regulatory_chunks",
                record_id=f"CLAUSE:{cid}",
                text_for_embedding=text,
                payload={
                    "clauseId": cid,
                    "clauseNumber": c.get("clauseNumber", ""),
                    "title": c.get("title", ""),
                    "category": c.get("category", ""),
                    "ruleSetId": c.get("ruleSetId", "RS-APH-2026-V2"),
                    "pageReference": c.get("pageReference", ""),
                    "excerpt": c.get("excerpt", ""),
                    "fullText": c.get("fullText", ""),
                },
            )
            results.append(res)
        return {
            "success": True,
            "indexedCount": len(results),
            "collection": "regulatory_chunks",
            "denseVectorsIndexed": sum(1 for r in results if r["denseVectorIndexed"]),
        }

    def index_authorized_record_summaries(self, records: List[Dict[str, Any]]) -> Dict[str, Any]:
        results = []
        for rec in records:
            rid = rec.get("id") or f"{rec.get('institutionId')}-{rec.get('academicYear')}"
            text = (
                f"Authorized Institutional Record for {rec.get('institutionName', '')} ({rec.get('institutionId', '')}) "
                f"Academic Year {rec.get('academicYear', '')}: "
                f"Approved Intake={rec.get('approvedIntake', '')}, "
                f"Built-Up Area={rec.get('builtUpAreaSqm', '')} sq.m, "
                f"Land Area={rec.get('landAreaAcres', '')} acres, "
                f"Fire NOC={rec.get('fireNocRef', '')} valid until {rec.get('fireNocExpiry', '')}, "
                f"Summary: {rec.get('summary', '')}"
            )
            res = self._upsert_item(
                collection_name="authorized_record_summaries",
                record_id=f"AUTHREC:{rid}",
                text_for_embedding=text,
                payload={
                    "recordId": rid,
                    "institutionId": rec.get("institutionId", ""),
                    "institutionName": rec.get("institutionName", ""),
                    "academicYear": rec.get("academicYear", ""),
                    "approvedIntake": rec.get("approvedIntake"),
                    "builtUpAreaSqm": rec.get("builtUpAreaSqm"),
                    "landAreaAcres": rec.get("landAreaAcres"),
                    "fireNocRef": rec.get("fireNocRef"),
                    "fireNocExpiry": rec.get("fireNocExpiry"),
                    "summary": rec.get("summary", ""),
                },
            )
            results.append(res)
        return {
            "success": True,
            "indexedCount": len(results),
            "collection": "authorized_record_summaries",
        }

    def index_document_vrag_and_mrag(
        self,
        document_id: str,
        application_id: str,
        institution_id: str,
        title: str,
        version: str = "v1.0",
        file_path: Optional[str] = None,
        pages: Optional[List[Dict[str, Any]]] = None,
        run_vlm_on_pages: bool = True,
    ) -> Dict[str, Any]:
        """
        Executes both MRAG (document_text_chunks) and VRAG (visual_page_descriptions):
        - Renders PDF pages to bounded-resolution PNGs in protected storage (`uploads/rendered_pages/`)
        - Invokes local Ollama Vision-Language Model (`riven/smolvlm:latest`) to generate structured visual descriptions
        - Stores page-level text chunks and visual descriptions in persistent Qdrant + metadata mirror
        """
        text_indexed = 0
        visual_indexed = 0
        vrag_page_outputs: List[Dict[str, Any]] = []

        # 1. If a real file exists on disk, render pages via PyMuPDF for VRAG
        rendered_images_by_page: Dict[int, Dict[str, Any]] = {}
        if file_path and os.path.exists(file_path):
            ext = os.path.splitext(file_path)[1].lower()
            if ext == ".pdf":
                try:
                    doc = pymupdf.open(file_path)
                    for idx in range(min(len(doc), 15)):
                        page_no = idx + 1
                        page = doc[idx]
                        pix = page.get_pixmap(dpi=130)
                        img_bytes = pix.tobytes("png")
                        img_sha256 = hashlib.sha256(img_bytes).hexdigest()
                        out_name = f"{document_id}_{version}_p{page_no}.png"
                        out_path = os.path.join(RENDERED_PAGES_DIR, out_name)
                        with open(out_path, "wb") as f:
                            f.write(img_bytes)
                        rendered_images_by_page[page_no] = {
                            "imagePath": out_path,
                            "imageBytes": img_bytes,
                            "imageSha256": img_sha256,
                            "nativeText": page.get_text() or "",
                        }
                    doc.close()
                except Exception:
                    pass
            elif ext in [".png", ".jpg", ".jpeg", ".tiff"]:
                try:
                    with open(file_path, "rb") as f:
                        img_bytes = f.read()
                    img_sha256 = hashlib.sha256(img_bytes).hexdigest()
                    rendered_images_by_page[1] = {
                        "imagePath": file_path,
                        "imageBytes": img_bytes,
                        "imageSha256": img_sha256,
                        "nativeText": "",
                    }
                except Exception:
                    pass

        # 2. Index provided pages (and/or rendered pages)
        page_numbers = sorted(
            set(
                list(rendered_images_by_page.keys())
                + [int(p.get("pageNumber", 1)) for p in (pages or [])]
            )
        )
        if not page_numbers:
            page_numbers = [1]

        for pno in page_numbers:
            page_dict = next((p for p in (pages or []) if int(p.get("pageNumber", 1)) == pno), {})
            body_lines = page_dict.get("bodyLines", [])
            if isinstance(body_lines, str):
                try:
                    body_lines = json.loads(body_lines)
                except Exception:
                    body_lines = [body_lines]
            page_text = " ".join(str(x) for x in body_lines if x).strip()
            rendered_info = rendered_images_by_page.get(pno)
            if not page_text and rendered_info:
                page_text = rendered_info.get("nativeText", "").strip()

            # A. Index MRAG document_text_chunks
            if page_text:
                chunk_text = (
                    f"Document: {title} ({document_id} {version}) Page {pno}. "
                    f"Authority: {page_dict.get('headerAuthority', '')}. "
                    f"Certificate: {page_dict.get('certificateNumber', '')}. "
                    f"Issue Date: {page_dict.get('issueDate', '')}. "
                    f"Content: {page_text}"
                )
                self._upsert_item(
                    collection_name="document_text_chunks",
                    record_id=f"DOCTEXT:{document_id}:{version}:P{pno}",
                    text_for_embedding=chunk_text,
                    payload={
                        "documentId": document_id,
                        "applicationId": application_id,
                        "institutionId": institution_id,
                        "documentTitle": title,
                        "version": version,
                        "pageNumber": pno,
                        "certificateNumber": page_dict.get("certificateNumber", ""),
                        "issueDate": page_dict.get("issueDate", ""),
                        "textSnippet": page_text[:600],
                    },
                )
                text_indexed += 1

            # B. Index VRAG visual_page_descriptions via Ollama VLM if rendered image exists
            vlm_description = ""
            vlm_status = "NOT_EVALUATED"
            vlm_model = None
            vlm_provenance = None

            if rendered_info and run_vlm_on_pages:
                prompt = (
                    "Inspect this regulatory document page image. Describe: "
                    "(1) document type and visible headings, "
                    "(2) visible dates, certificate numbers, areas, or intake numbers, "
                    "(3) visible stamps, seals, signatures, or tables, and "
                    "(4) any visual anomalies or legibility issues."
                )
                vlm_res = ollama_gateway.analyze_image_vision(
                    task_name=f"vrag_page_caption_{document_id}_p{pno}",
                    image_bytes=rendered_info["imageBytes"],
                    prompt=prompt,
                )
                vlm_status = vlm_res["status"]
                vlm_description = vlm_res.get("text") or ""
                vlm_model = vlm_res.get("modelUsed")
                vlm_provenance = vlm_res.get("provenance")

            # Even if no raw image bytes were on disk (e.g. seeded metadata page), record structured visual layout summary
            visual_summary_text = (
                vlm_description
                if vlm_description
                else (
                    f"Visual Layout Summary for {title} ({document_id} {version}) Page {pno}: "
                    f"Header={page_dict.get('headerAuthority', 'Statutory Authority')}, "
                    f"Certificate={page_dict.get('certificateNumber', 'N/A')}, "
                    f"Stamp={page_dict.get('stampText', 'Unverified')}, "
                    f"Signatory={page_dict.get('signatory', 'Unverified')}."
                )
            )

            self._upsert_item(
                collection_name="visual_page_descriptions",
                record_id=f"VRAG:{document_id}:{version}:P{pno}",
                text_for_embedding=visual_summary_text,
                payload={
                    "documentId": document_id,
                    "applicationId": application_id,
                    "institutionId": institution_id,
                    "documentTitle": title,
                    "version": version,
                    "pageNumber": pno,
                    "renderedImagePath": rendered_info["imagePath"] if rendered_info else None,
                    "imageSha256": rendered_info["imageSha256"] if rendered_info else None,
                    "vlmStatus": vlm_status if rendered_info else "METADATA_LAYOUT_ONLY",
                    "vlmModelUsed": vlm_model,
                    "visualDescription": visual_summary_text[:800],
                    "provenance": vlm_provenance,
                },
            )
            visual_indexed += 1
            vrag_page_outputs.append(
                {
                    "pageNumber": pno,
                    "vlmStatus": vlm_status if rendered_info else "METADATA_LAYOUT_ONLY",
                    "vlmModelUsed": vlm_model,
                    "visualDescription": visual_summary_text[:500],
                    "renderedImagePath": rendered_info["imagePath"] if rendered_info else None,
                }
            )

        return {
            "success": True,
            "documentId": document_id,
            "applicationId": application_id,
            "institutionId": institution_id,
            "textChunksIndexed": text_indexed,
            "visualPagesIndexed": visual_indexed,
            "vragPages": vrag_page_outputs,
        }

    def hybrid_retrieve(
        self,
        query: str,
        institution_id: Optional[str] = None,
        application_id: Optional[str] = None,
        collections: Optional[List[str]] = None,
        top_k: int = 8,
    ) -> Dict[str, Any]:
        """
        Executes Hybrid MRAG + VRAG Retrieval:
        1. Enforces strict tenant isolation (`institutionId` filter on tenant-scoped collections).
        2. Queries Qdrant dense vectors if Ollama embedding capability is active.
        3. Queries lexical BM25/token overlap + exact clause-number & identifier match across collections.
        4. Combines rankings via Reciprocal Rank Fusion (RRF, k=60).
        """
        target_collections = collections or COLLECTION_NAMES
        query_tokens = [
            t
            for t in re.sub(r"[^a-z0-9\.\-]", " ", query.lower()).split()
            if len(t) > 1
        ]

        # Attempt query embedding via Ollama
        emb_res = ollama_gateway.embed_texts([query], task_name="hybrid_mrag_query")
        query_vec = (
            emb_res["embeddings"][0]
            if emb_res["status"] == "SUCCESS" and emb_res.get("embeddings")
            else None
        )

        fused_candidates: Dict[str, Dict[str, Any]] = {}

        for col in target_collections:
            if col not in COLLECTION_NAMES:
                continue

            is_tenant_scoped = col in [
                "document_text_chunks",
                "visual_page_descriptions",
                "authorized_record_summaries",
            ]

            # --- Path A: Dense Vector Search in Qdrant ---
            if query_vec is not None and self._client:
                try:
                    must_conditions = []
                    if is_tenant_scoped and institution_id and institution_id != "ALL":
                        must_conditions.append(
                            FieldCondition(
                                key="institutionId",
                                match=MatchValue(value=institution_id),
                            )
                        )
                    if (
                        col in ["document_text_chunks", "visual_page_descriptions"]
                        and application_id
                        and application_id != "ALL"
                    ):
                        must_conditions.append(
                            FieldCondition(
                                key="applicationId",
                                match=MatchValue(value=application_id),
                            )
                        )

                    q_filter = Filter(must=must_conditions) if must_conditions else None
                    hits = self._client.search(
                        collection_name=col,
                        query_vector=query_vec,
                        query_filter=q_filter,
                        limit=top_k,
                    )
                    for rank_idx, h in enumerate(hits):
                        rid = h.payload.get("recordId") or str(h.id)
                        rrf_score = 1.0 / (60.0 + rank_idx + 1.0)
                        entry = fused_candidates.setdefault(
                            rid,
                            {
                                "recordId": rid,
                                "collection": col,
                                "payload": h.payload,
                                "denseScore": round(float(h.score), 4),
                                "lexicalScore": 0.0,
                                "rrfScore": 0.0,
                                "retrievalMethods": [],
                            },
                        )
                        entry["rrfScore"] += rrf_score
                        if "dense_qdrant" not in entry["retrievalMethods"]:
                            entry["retrievalMethods"].append("dense_qdrant")
                except Exception:
                    pass

            # --- Path B: Lexical / Exact Identifier / Clause Number Search ---
            records = self._payload_store.get(col, [])
            lexical_scored: List[tuple[float, Dict[str, Any]]] = []
            for item in records:
                # Enforce strict tenant isolation
                if is_tenant_scoped and institution_id and institution_id != "ALL":
                    if item.get("institutionId") != institution_id:
                        continue
                if (
                    col in ["document_text_chunks", "visual_page_descriptions"]
                    and application_id
                    and application_id != "ALL"
                ):
                    if item.get("applicationId") != application_id:
                        continue

                haystack = str(item.get("indexedText", "")).lower()
                if not haystack:
                    continue

                score = 0.0
                for tok in query_tokens:
                    if tok in haystack:
                        score += 1.0
                        # Boost exact clause numbers or document IDs
                        if any(c.isdigit() for c in tok) and ("-" in tok or "." in tok):
                            score += 2.5

                if score > 0 or not query_tokens:
                    norm_score = score / max(1.0, math.sqrt(len(query_tokens)))
                    lexical_scored.append((norm_score, item))

            lexical_scored.sort(key=lambda x: x[0], reverse=True)
            for rank_idx, (l_score, item) in enumerate(lexical_scored[:top_k]):
                rid = item.get("recordId", "")
                rrf_score = 1.0 / (60.0 + rank_idx + 1.0)
                entry = fused_candidates.setdefault(
                    rid,
                    {
                        "recordId": rid,
                        "collection": col,
                        "payload": item,
                        "denseScore": None,
                        "lexicalScore": round(l_score, 4),
                        "rrfScore": 0.0,
                        "retrievalMethods": [],
                    },
                )
                entry["lexicalScore"] = round(l_score, 4)
                entry["rrfScore"] = round(entry["rrfScore"] + rrf_score, 6)
                if "lexical_bm25_exact" not in entry["retrievalMethods"]:
                    entry["retrievalMethods"].append("lexical_bm25_exact")

        ranked = sorted(
            fused_candidates.values(),
            key=lambda x: (x["rrfScore"], x["lexicalScore"] or 0.0),
            reverse=True,
        )[:top_k]

        return {
            "query": query,
            "institutionIdFilter": institution_id,
            "applicationIdFilter": application_id,
            "denseVectorUsed": query_vec is not None,
            "embeddingStatus": emb_res["status"],
            "embeddingProvenance": emb_res.get("provenance"),
            "resultsCount": len(ranked),
            "results": ranked,
        }


# Singleton instance
qdrant_vrag_mrag = QdrantVragMragEngine()
