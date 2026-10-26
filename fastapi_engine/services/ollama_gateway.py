"""
TRACE 2.0 — Centralized Ollama Gateway
Strictly enforces Ollama-only AI inference across text, vision (VLM), and embedding tasks.
Never silently downloads models; discovers installed models and capabilities dynamically,
validates outputs against Pydantic schemas, and records full model provenance.
"""

import os
import time
import json
import base64
import threading
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Type, TypeVar
from pydantic import BaseModel, Field
import requests

OLLAMA_BASE_URL = os.environ.get("OLLAMA_URL", "http://localhost:11434").rstrip("/")

T = TypeVar("T", bound=BaseModel)


class ModelProvenance(BaseModel):
    task: str
    modelName: str
    modelDigest: Optional[str] = None
    capabilityUsed: str
    durationMs: float
    status: str  # "SUCCESS", "MODEL_UNAVAILABLE", "EMBEDDING_SERVER_DISABLED", "SCHEMA_INVALID", "ERROR"
    blockerCode: Optional[str] = None
    blockerMessage: Optional[str] = None
    remediationCommand: Optional[str] = None
    timestamp: str


class DiscoveredOllamaModel(BaseModel):
    name: str
    digest: str
    sizeBytes: int
    sizeFormatted: str
    family: str
    parameterSize: str
    quantizationLevel: str
    capabilities: List[str]
    contextLength: int
    supportsVision: bool
    supportsTools: bool
    supportsEmbedding: bool
    modifiedAt: str


class OllamaGatewayStatus(BaseModel):
    online: bool
    baseUrl: str
    version: Optional[str] = None
    installedModels: List[DiscoveredOllamaModel]
    assignedRouting: Dict[str, Optional[str]]
    capabilitiesAvailable: Dict[str, bool]
    embeddingStatus: Dict[str, Any]
    visionStatus: Dict[str, Any]
    textStatus: Dict[str, Any]
    recentProvenanceLogs: List[ModelProvenance]
    checkedAt: str


class OllamaGateway:
    def __init__(self, base_url: str = OLLAMA_BASE_URL):
        self.base_url = base_url.rstrip("/")
        self._lock = threading.Lock()
        self._provenance_logs: List[ModelProvenance] = []
        self._cached_models: List[DiscoveredOllamaModel] = []
        self._last_discovery_ts: float = 0.0
        self._embedding_endpoint_supported: Optional[bool] = None
        self._embedding_error_detail: Optional[str] = None
        self._task_routing_overrides: Dict[str, str] = {}

    def _record_provenance(
        self,
        task: str,
        model_name: str,
        capability: str,
        duration_ms: float,
        status: str,
        digest: Optional[str] = None,
        blocker_code: Optional[str] = None,
        blocker_message: Optional[str] = None,
        remediation_cmd: Optional[str] = None,
    ) -> ModelProvenance:
        prov = ModelProvenance(
            task=task,
            modelName=model_name,
            modelDigest=digest,
            capabilityUsed=capability,
            durationMs=round(duration_ms, 2),
            status=status,
            blockerCode=blocker_code,
            blockerMessage=blocker_message,
            remediationCommand=remediation_cmd,
            timestamp=datetime.now(timezone.utc).isoformat(),
        )
        with self._lock:
            self._provenance_logs.insert(0, prov)
            if len(self._provenance_logs) > 150:
                self._provenance_logs = self._provenance_logs[:150]
        return prov

    def discover_models(self, force_refresh: bool = False) -> OllamaGatewayStatus:
        now = time.time()
        if not force_refresh and self._cached_models and (now - self._last_discovery_ts) < 15.0:
            return self._build_status(online=True)

        online = False
        version_str = None
        discovered: List[DiscoveredOllamaModel] = []

        try:
            ver_resp = requests.get(f"{self.base_url}/api/version", timeout=3.0)
            if ver_resp.ok:
                version_str = ver_resp.json().get("version", "unknown")
                online = True
        except Exception:
            online = False

        if not online:
            return OllamaGatewayStatus(
                online=False,
                baseUrl=self.base_url,
                version=None,
                installedModels=[],
                assignedRouting={"text": None, "vision": None, "embedding": None, "coding": None},
                capabilitiesAvailable={"text": False, "vision": False, "embedding": False},
                embeddingStatus={
                    "available": False,
                    "blockerCode": "OLLAMA_OFFLINE",
                    "message": f"Native Ollama server at {self.base_url} is unreachable.",
                    "userInstallCommand": "ollama serve",
                },
                visionStatus={
                    "available": False,
                    "blockerCode": "OLLAMA_OFFLINE",
                    "message": f"Native Ollama server at {self.base_url} is unreachable.",
                    "userInstallCommand": "ollama serve",
                },
                textStatus={
                    "available": False,
                    "blockerCode": "OLLAMA_OFFLINE",
                    "message": f"Native Ollama server at {self.base_url} is unreachable.",
                    "userInstallCommand": "ollama serve",
                },
                recentProvenanceLogs=self._provenance_logs[:25],
                checkedAt=datetime.now(timezone.utc).isoformat(),
            )

        try:
            tags_resp = requests.get(f"{self.base_url}/api/tags", timeout=5.0)
            tags_data = tags_resp.json() if tags_resp.ok else {}
            models_raw = tags_data.get("models", [])

            for m in models_raw:
                m_name = m.get("name", "")
                m_digest = m.get("digest", "")[:16]
                m_size = int(m.get("size", 0))
                m_size_str = f"{round(m_size / (1024 * 1024), 1)} MB"
                details = m.get("details", {})
                family = details.get("family", "unknown")
                param_size = details.get("parameter_size", "unknown")
                quant = details.get("quantization_level", "unknown")

                caps: List[str] = ["completion"]
                ctx_len = 8192
                try:
                    show_resp = requests.post(
                        f"{self.base_url}/api/show",
                        json={"name": m_name},
                        timeout=4.0,
                    )
                    if show_resp.ok:
                        show_json = show_resp.json()
                        caps = show_json.get("capabilities", ["completion"])
                        model_info = show_json.get("model_info", {})
                        for k, v in model_info.items():
                            if k.endswith(".context_length") and isinstance(v, int):
                                ctx_len = v
                                break
                except Exception:
                    pass

                supports_vision = (
                    "vision" in caps
                    or "vlm" in m_name.lower()
                    or "llava" in m_name.lower()
                    or "smolvlm" in m_name.lower()
                    or "minicpm-v" in m_name.lower()
                )
                supports_tools = "tools" in caps
                is_embed_model = (
                    "embedding" in caps
                    or "embed" in m_name.lower()
                    or "bge" in m_name.lower()
                    or "nomic" in m_name.lower()
                )

                discovered.append(
                    DiscoveredOllamaModel(
                        name=m_name,
                        digest=m_digest,
                        sizeBytes=m_size,
                        sizeFormatted=m_size_str,
                        family=family,
                        parameterSize=param_size,
                        quantizationLevel=quant,
                        capabilities=caps,
                        contextLength=ctx_len,
                        supportsVision=supports_vision,
                        supportsTools=supports_tools,
                        supportsEmbedding=is_embed_model,
                        modifiedAt=m.get("modified_at", ""),
                    )
                )

            # Probe /api/embed once to verify if the Ollama server runtime supports embeddings
            if self._embedding_endpoint_supported is None:
                probe_model = next(
                    (d.name for d in discovered if d.supportsEmbedding),
                    discovered[0].name if discovered else None,
                )
                if probe_model:
                    try:
                        emb_probe = requests.post(
                            f"{self.base_url}/api/embed",
                            json={"model": probe_model, "input": ["TRACE probe"]},
                            timeout=3.0,
                        )
                        if emb_probe.status_code == 200 and emb_probe.json().get("embeddings"):
                            self._embedding_endpoint_supported = True
                            self._embedding_error_detail = None
                        else:
                            self._embedding_endpoint_supported = False
                            try:
                                self._embedding_error_detail = emb_probe.json().get("error", emb_probe.text)
                            except Exception:
                                self._embedding_error_detail = emb_probe.text
                    except Exception as exc:
                        self._embedding_endpoint_supported = False
                        self._embedding_error_detail = str(exc)

            with self._lock:
                self._cached_models = discovered
                self._last_discovery_ts = now
                self._version_str = version_str

        except Exception as exc:
            self._embedding_error_detail = str(exc)

        return self._build_status(online=True, version_str=getattr(self, "_version_str", version_str))

    def _select_models(self) -> Dict[str, Optional[str]]:
        models = self._cached_models
        names = [m.name for m in models]

        # 1. Text / Structured reasoning model selection
        text_model = self._task_routing_overrides.get("text")
        if not text_model or text_model not in names:
            preferred_text = [
                "qwen2.5:1.5b-instruct",
                "qwen2.5-coder:3b",
                "qwen2.5:0.5b-instruct",
                "zenthi-ai:latest",
            ]
            text_model = next((p for p in preferred_text if p in names), None)
            if not text_model:
                non_vision = [m.name for m in models if "completion" in m.capabilities]
                text_model = non_vision[0] if non_vision else None

        # 2. Fast Text model
        fast_text_model = (
            "qwen2.5:0.5b-instruct"
            if "qwen2.5:0.5b-instruct" in names
            else text_model
        )

        # 3. Vision / VLM model selection
        vision_model = self._task_routing_overrides.get("vision")
        if not vision_model or vision_model not in names:
            vision_candidates = [m.name for m in models if m.supportsVision]
            vision_model = vision_candidates[0] if vision_candidates else None

        # 4. Dedicated Embedding model selection
        embed_model = self._task_routing_overrides.get("embedding")
        if not embed_model or embed_model not in names:
            embed_candidates = [m.name for m in models if m.supportsEmbedding]
            embed_model = embed_candidates[0] if embed_candidates else None

        return {
            "text": text_model,
            "fast_text": fast_text_model,
            "vision": vision_model,
            "embedding": embed_model,
        }

    def _build_status(self, online: bool, version_str: Optional[str] = None) -> OllamaGatewayStatus:
        routing = self._select_models()
        has_text = bool(routing.get("text"))
        has_vision = bool(routing.get("vision"))
        has_embed_model = bool(routing.get("embedding"))
        embed_ready = bool(has_embed_model and self._embedding_endpoint_supported)

        if embed_ready:
            emb_status = {
                "available": True,
                "activeModel": routing["embedding"],
                "blockerCode": None,
                "message": f"Ollama dense embeddings active via {routing['embedding']}.",
                "userInstallCommand": None,
            }
        elif not self._embedding_endpoint_supported and self._embedding_error_detail:
            emb_status = {
                "available": False,
                "activeModel": routing.get("embedding"),
                "blockerCode": "EMBEDDING_CAPABILITY_UNAVAILABLE",
                "message": (
                    f"Ollama server returned: '{self._embedding_error_detail}'. "
                    + (
                        "Additionally, no dedicated embedding model (e.g. nomic-embed-text) is installed."
                        if not has_embed_model
                        else ""
                    )
                ).strip(),
                "userInstallCommand": "ollama pull nomic-embed-text && ollama serve --embeddings",
                "recommendedModels": ["nomic-embed-text", "mxbai-embed-large", "all-minilm"],
            }
        else:
            emb_status = {
                "available": False,
                "activeModel": None,
                "blockerCode": "EMBEDDING_MODEL_UNAVAILABLE",
                "message": "No dedicated Ollama embedding model is installed. Dense vector similarity is marked MODEL_UNAVAILABLE until an embedding model is pulled by the user.",
                "userInstallCommand": "ollama pull nomic-embed-text",
                "recommendedModels": ["nomic-embed-text", "mxbai-embed-large", "all-minilm"],
            }

        if has_vision:
            vis_status = {
                "available": True,
                "activeModel": routing["vision"],
                "blockerCode": None,
                "message": f"Ollama Vision-Language Model active via {routing['vision']}.",
                "userInstallCommand": None,
            }
        else:
            vis_status = {
                "available": False,
                "activeModel": None,
                "blockerCode": "VISION_MODEL_UNAVAILABLE",
                "message": "No Ollama vision model (VLM) is installed. Scanned-page OCR and VRAG visual inspection require a local Ollama VLM.",
                "userInstallCommand": "ollama pull riven/smolvlm:latest",
            }

        if has_text:
            txt_status = {
                "available": True,
                "activeModel": routing["text"],
                "fastModel": routing.get("fast_text"),
                "blockerCode": None,
                "message": f"Ollama structured text reasoning active via {routing['text']}.",
                "userInstallCommand": None,
            }
        else:
            txt_status = {
                "available": False,
                "activeModel": None,
                "blockerCode": "TEXT_MODEL_UNAVAILABLE",
                "message": "No Ollama text generation model is installed.",
                "userInstallCommand": "ollama pull qwen2.5:1.5b-instruct",
            }

        return OllamaGatewayStatus(
            online=online,
            baseUrl=self.base_url,
            version=version_str,
            installedModels=self._cached_models,
            assignedRouting=routing,
            capabilitiesAvailable={
                "text": has_text,
                "vision": has_vision,
                "embedding": embed_ready,
            },
            embeddingStatus=emb_status,
            visionStatus=vis_status,
            textStatus=txt_status,
            recentProvenanceLogs=self._provenance_logs[:25],
            checkedAt=datetime.now(timezone.utc).isoformat(),
        )

    def set_routing_override(self, task: str, model_name: str) -> Dict[str, Any]:
        status = self.discover_models(force_refresh=True)
        installed_names = [m.name for m in status.installedModels]
        if model_name not in installed_names:
            return {
                "success": False,
                "error": f"Model '{model_name}' is not installed in local Ollama ({installed_names}).",
            }
        self._task_routing_overrides[task] = model_name
        return {
            "success": True,
            "assignedRouting": self._select_models(),
        }

    def generate_json(
        self,
        task_name: str,
        prompt: str,
        system_prompt: str = "You are TRACE, an AICTE regulatory compliance decision-support assistant. Respond strictly in valid JSON.",
        schema_model: Optional[Type[T]] = None,
        model_override: Optional[str] = None,
        prefer_fast: bool = False,
        timeout_sec: float = 25.0,
    ) -> Dict[str, Any]:
        """
        Invokes local Ollama /api/generate with format='json', validates against Pydantic schema if provided,
        and returns {"status": ..., "data": ..., "provenance": ...}.
        """
        t0 = time.time()
        status = self.discover_models(force_refresh=False)
        if not status.online:
            prov = self._record_provenance(
                task=task_name,
                model_name="NONE",
                capability="text",
                duration_ms=(time.time() - t0) * 1000.0,
                status="MODEL_UNAVAILABLE",
                blocker_code="OLLAMA_OFFLINE",
                blocker_message=f"Ollama server at {self.base_url} is offline.",
                remediation_cmd="ollama serve",
            )
            return {"status": "MODEL_UNAVAILABLE", "data": None, "provenance": prov.model_dump()}

        routing = status.assignedRouting
        chosen_model = (
            model_override
            or (routing.get("fast_text") if prefer_fast else routing.get("text"))
        )
        if not chosen_model:
            prov = self._record_provenance(
                task=task_name,
                model_name="NONE",
                capability="text",
                duration_ms=(time.time() - t0) * 1000.0,
                status="MODEL_UNAVAILABLE",
                blocker_code="TEXT_MODEL_UNAVAILABLE",
                blocker_message="No installed Ollama text model found.",
                remediation_cmd="ollama pull qwen2.5:1.5b-instruct",
            )
            return {"status": "MODEL_UNAVAILABLE", "data": None, "provenance": prov.model_dump()}

        model_meta = next((m for m in status.installedModels if m.name == chosen_model), None)
        digest = model_meta.digest if model_meta else None

        try:
            payload: Dict[str, Any] = {
                "model": chosen_model,
                "prompt": prompt,
                "system": system_prompt,
                "format": "json",
                "stream": False,
                "options": {
                    "temperature": 0.1,
                    "num_predict": 512,
                },
            }
            resp = requests.post(f"{self.base_url}/api/generate", json=payload, timeout=timeout_sec)
            duration_ms = (time.time() - t0) * 1000.0
            if not resp.ok:
                prov = self._record_provenance(
                    task=task_name,
                    model_name=chosen_model,
                    capability="text",
                    duration_ms=duration_ms,
                    status="ERROR",
                    digest=digest,
                    blocker_code=f"HTTP_{resp.status_code}",
                    blocker_message=resp.text[:250],
                )
                return {"status": "ERROR", "data": None, "provenance": prov.model_dump()}

            raw_response = resp.json().get("response", "{}")
            parsed_json = json.loads(raw_response)

            if schema_model is not None:
                validated = schema_model.model_validate(parsed_json)
                parsed_json = validated.model_dump()

            prov = self._record_provenance(
                task=task_name,
                model_name=chosen_model,
                capability="text",
                duration_ms=duration_ms,
                status="SUCCESS",
                digest=digest,
            )
            return {"status": "SUCCESS", "data": parsed_json, "provenance": prov.model_dump()}

        except Exception as exc:
            duration_ms = (time.time() - t0) * 1000.0
            prov = self._record_provenance(
                task=task_name,
                model_name=chosen_model,
                capability="text",
                duration_ms=duration_ms,
                status="ERROR",
                digest=digest,
                blocker_code="INFERENCE_OR_SCHEMA_ERROR",
                blocker_message=str(exc)[:300],
            )
            return {"status": "ERROR", "data": None, "provenance": prov.model_dump()}

    def analyze_image_vision(
        self,
        task_name: str,
        image_bytes: bytes,
        prompt: str,
        model_override: Optional[str] = None,
        timeout_sec: float = 35.0,
    ) -> Dict[str, Any]:
        """
        Invokes local Ollama Vision-Language Model (e.g., riven/smolvlm:latest) on a rendered page or image.
        Never falls back to EasyOCR or non-Ollama models. If no vision model is available, returns MODEL_UNAVAILABLE.
        """
        t0 = time.time()
        status = self.discover_models(force_refresh=False)
        if not status.online:
            prov = self._record_provenance(
                task=task_name,
                model_name="NONE",
                capability="vision",
                duration_ms=(time.time() - t0) * 1000.0,
                status="MODEL_UNAVAILABLE",
                blocker_code="OLLAMA_OFFLINE",
                blocker_message=f"Ollama server at {self.base_url} is offline.",
                remediation_cmd="ollama serve",
            )
            return {"status": "MODEL_UNAVAILABLE", "text": None, "provenance": prov.model_dump()}

        chosen_vlm = model_override or status.assignedRouting.get("vision")
        if not chosen_vlm:
            prov = self._record_provenance(
                task=task_name,
                model_name="NONE",
                capability="vision",
                duration_ms=(time.time() - t0) * 1000.0,
                status="MODEL_UNAVAILABLE",
                blocker_code="VISION_MODEL_UNAVAILABLE",
                blocker_message="No vision-capable Ollama model is installed. Scanned-page OCR and VRAG visual inspection cannot run without an Ollama VLM.",
                remediation_cmd="ollama pull riven/smolvlm:latest",
            )
            return {"status": "MODEL_UNAVAILABLE", "text": None, "provenance": prov.model_dump()}

        model_meta = next((m for m in status.installedModels if m.name == chosen_vlm), None)
        digest = model_meta.digest if model_meta else None

        try:
            b64_img = base64.b64encode(image_bytes).decode("utf-8")
            payload = {
                "model": chosen_vlm,
                "prompt": prompt,
                "images": [b64_img],
                "stream": False,
                "options": {
                    "temperature": 0.1,
                    "num_predict": 400,
                },
            }
            resp = requests.post(f"{self.base_url}/api/generate", json=payload, timeout=timeout_sec)
            duration_ms = (time.time() - t0) * 1000.0
            if not resp.ok:
                prov = self._record_provenance(
                    task=task_name,
                    model_name=chosen_vlm,
                    capability="vision",
                    duration_ms=duration_ms,
                    status="ERROR",
                    digest=digest,
                    blocker_code=f"HTTP_{resp.status_code}",
                    blocker_message=resp.text[:250],
                )
                return {"status": "ERROR", "text": None, "provenance": prov.model_dump()}

            text_out = (resp.json().get("response") or "").strip()
            prov = self._record_provenance(
                task=task_name,
                model_name=chosen_vlm,
                capability="vision",
                duration_ms=duration_ms,
                status="SUCCESS",
                digest=digest,
            )
            return {
                "status": "SUCCESS",
                "text": text_out,
                "modelUsed": chosen_vlm,
                "provenance": prov.model_dump(),
            }
        except Exception as exc:
            duration_ms = (time.time() - t0) * 1000.0
            prov = self._record_provenance(
                task=task_name,
                model_name=chosen_vlm,
                capability="vision",
                duration_ms=duration_ms,
                status="ERROR",
                digest=digest,
                blocker_code="VLM_INFERENCE_ERROR",
                blocker_message=str(exc)[:300],
            )
            return {"status": "ERROR", "text": None, "provenance": prov.model_dump()}

    def embed_texts(
        self,
        texts: List[str],
        task_name: str = "embed_chunks",
        model_override: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Generates semantic embeddings via local Ollama /api/embed.
        Never uses sentence-transformers, CLIP, or non-Ollama embeddings.
        If no Ollama embedding model is installed or the server has embeddings disabled,
        returns status='MODEL_UNAVAILABLE' with explicit blocker & user install command.
        """
        t0 = time.time()
        status = self.discover_models(force_refresh=False)
        if not status.online:
            prov = self._record_provenance(
                task=task_name,
                model_name="NONE",
                capability="embedding",
                duration_ms=(time.time() - t0) * 1000.0,
                status="MODEL_UNAVAILABLE",
                blocker_code="OLLAMA_OFFLINE",
                blocker_message="Local Ollama server is offline.",
                remediation_cmd="ollama serve",
            )
            return {"status": "MODEL_UNAVAILABLE", "embeddings": None, "provenance": prov.model_dump()}

        chosen_embed = model_override or status.assignedRouting.get("embedding")
        if not chosen_embed or not self._embedding_endpoint_supported:
            blocker_msg = status.embeddingStatus.get(
                "message",
                "Ollama embedding capability is unavailable.",
            )
            remediation_cmd = status.embeddingStatus.get(
                "userInstallCommand",
                "ollama pull nomic-embed-text && ollama serve --embeddings",
            )
            prov = self._record_provenance(
                task=task_name,
                model_name=chosen_embed or "NONE",
                capability="embedding",
                duration_ms=(time.time() - t0) * 1000.0,
                status="MODEL_UNAVAILABLE",
                blocker_code=status.embeddingStatus.get("blockerCode", "EMBEDDING_MODEL_UNAVAILABLE"),
                blocker_message=blocker_msg,
                remediation_cmd=remediation_cmd,
            )
            return {
                "status": "MODEL_UNAVAILABLE",
                "embeddings": None,
                "provenance": prov.model_dump(),
            }

        try:
            resp = requests.post(
                f"{self.base_url}/api/embed",
                json={"model": chosen_embed, "input": texts},
                timeout=30.0,
            )
            duration_ms = (time.time() - t0) * 1000.0
            if resp.status_code == 200:
                embs = resp.json().get("embeddings", [])
                prov = self._record_provenance(
                    task=task_name,
                    model_name=chosen_embed,
                    capability="embedding",
                    duration_ms=duration_ms,
                    status="SUCCESS",
                )
                return {
                    "status": "SUCCESS",
                    "embeddings": embs,
                    "dimension": len(embs[0]) if embs else 0,
                    "modelUsed": chosen_embed,
                    "provenance": prov.model_dump(),
                }
            else:
                prov = self._record_provenance(
                    task=task_name,
                    model_name=chosen_embed,
                    capability="embedding",
                    duration_ms=duration_ms,
                    status="MODEL_UNAVAILABLE",
                    blocker_code=f"HTTP_{resp.status_code}",
                    blocker_message=resp.text[:250],
                    remediation_cmd="ollama pull nomic-embed-text && ollama serve --embeddings",
                )
                return {
                    "status": "MODEL_UNAVAILABLE",
                    "embeddings": None,
                    "provenance": prov.model_dump(),
                }
        except Exception as exc:
            duration_ms = (time.time() - t0) * 1000.0
            prov = self._record_provenance(
                task=task_name,
                model_name=chosen_embed,
                capability="embedding",
                duration_ms=duration_ms,
                status="ERROR",
                blocker_code="EMBEDDING_EXCEPTION",
                blocker_message=str(exc)[:250],
            )
            return {"status": "ERROR", "embeddings": None, "provenance": prov.model_dump()}

    def user_initiated_pull(self, model_name: str) -> Dict[str, Any]:
        """
        Executes an explicit user-triggered model pull via POST /api/pull.
        Never called automatically; only invoked when an authorized administrator clicks Install/Pull.
        """
        t0 = time.time()
        try:
            resp = requests.post(
                f"{self.base_url}/api/pull",
                json={"name": model_name, "stream": False},
                timeout=300.0,
            )
            duration_ms = (time.time() - t0) * 1000.0
            if resp.ok:
                self.discover_models(force_refresh=True)
                self._record_provenance(
                    task="user_controlled_model_pull",
                    model_name=model_name,
                    capability="management",
                    duration_ms=duration_ms,
                    status="SUCCESS",
                )
                return {
                    "success": True,
                    "modelName": model_name,
                    "status": resp.json().get("status", "success"),
                    "durationMs": round(duration_ms, 2),
                }
            return {
                "success": False,
                "modelName": model_name,
                "error": resp.text[:300],
            }
        except Exception as exc:
            return {
                "success": False,
                "modelName": model_name,
                "error": str(exc)[:300],
            }


# Singleton instance
ollama_gateway = OllamaGateway()
