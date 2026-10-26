import unittest
import os
import sys

os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

from fastapi.testclient import TestClient
from fastapi_engine.main import app

class TestFastAPIDocumentAIEngine(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)

    def test_health_endpoint(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "healthy")
        self.assertEqual(len(data["features"]), 6)

    def test_chronograph_claim_extraction_and_contradiction(self):
        # Synthetic test document claims
        docs_payload = [
            {
                "id": "DOC-FIRE-01",
                "title": "Fire & Safety Clearance Certificate",
                "version": "v1.0",
                "pages": [
                    {
                        "pageNumber": 1,
                        "bodyLines": [
                            "Government of Maharashtra State Fire Services",
                            "Certificate No: NOC-MH-2024-8891",
                            "Issue Date: 12-08-2023",
                            "Validity Expiry Date: 31-12-2025"
                        ]
                    }
                ]
            },
            {
                "id": "DOC-LAND-01",
                "title": "Land Title Deed and Ownership Registry",
                "version": "v1.0",
                "pages": [
                    {
                        "pageNumber": 1,
                        "bodyLines": [
                            "Sub-Registrar Office Pune District",
                            "Total Site Area: 2.50 Acres",
                            "Ref No: REG-PUN-7712",
                            "Issue Date: 15-05-2022"
                        ]
                    }
                ]
            },
            {
                "id": "DOC-PLAN-01",
                "title": "Municipal Corporation Approved Building Plan",
                "version": "v1.0",
                "pages": [
                    {
                        "pageNumber": 1,
                        "bodyLines": [
                            "Pune Municipal Corporation Town Planning Cell",
                            "Approved Built-up Plot Area: 1.85 Acres",
                            "Plan Approval No: PMC-BLD-2023-094",
                            "Sanctioned Intake: 120 seats"
                        ]
                    }
                ]
            }
        ]

        # 1. Extract claims
        extract_res = self.client.post("/chronograph/extract-claims", json={
            "applicationId": "APP-TEST-2026",
            "institutionId": "INST-TEST-01",
            "documents": docs_payload
        })
        self.assertEqual(extract_res.status_code, 200)
        claims_data = extract_res.json()
        self.assertTrue(claims_data["success"])
        self.assertGreaterEqual(len(claims_data["claims"]), 4)

        # 2. Detect Contradictions
        contra_res = self.client.post("/chronograph/detect-contradictions", json={
            "applicationId": "APP-TEST-2026",
            "academicYear": "2026-27",
            "claims": claims_data["claims"]
        })
        self.assertEqual(contra_res.status_code, 200)
        contra_data = contra_res.json()
        self.assertTrue(contra_data["success"])
        self.assertGreaterEqual(contra_data["contradictionsCount"], 1)

        # Confirm Fire NOC expiry was detected as stale/expired against AY 2026-27
        expired_flagged = any(c["relationType"] == "STALE_EXPIRED" for c in contra_data["contradictions"])
        self.assertTrue(expired_flagged)

        # Confirm Area mismatch between Land Deed (2.50 Acres) and Building Plan (1.85 Acres) was flagged
        area_mismatch = any(c["relationType"] == "VALUE_MISMATCH" for c in contra_data["contradictions"])
        self.assertTrue(area_mismatch)

    def test_deltascan_identical_and_modified_pages(self):
        # Create small test PDF file
        import fitz
        test_pdf_path = os.path.abspath("test_deltascan_v1.pdf")
        doc = fitz.open()
        p1 = doc.new_page(width=600, height=800)
        p1.insert_text((50, 50), "Page 1: Title and Land Information")
        p2 = doc.new_page(width=600, height=800)
        p2.insert_text((50, 50), "Page 2: Original Completion Date: 01-Jan-2025")
        doc.save(test_pdf_path)
        doc.close()

        # DeltaScan initial plan
        delta_res = self.client.post("/deltascan/analyze-plan", json={
            "documentId": "DOC-DELTA-01",
            "newFilePath": test_pdf_path,
            "oldFilePath": test_pdf_path,
            "oldVersion": "v1.0",
            "newVersion": "v1.0"
        })
        self.assertEqual(delta_res.status_code, 200)
        plan = delta_res.json()
        self.assertTrue(plan["fileIdentical"])
        self.assertEqual(plan["cacheHitRate"], 1.0)
        self.assertEqual(plan["estimatedSavingsPercent"], 100.0)

        # Cleanup
        if os.path.exists(test_pdf_path):
            os.remove(test_pdf_path)

    def test_rulereplay_shadow_evaluation(self):
        res = self.client.post("/rulereplay/shadow-replay", json={
            "rulesetVersion": "v2026.2",
            "targetRulesetCode": "APH-2026-V2-AMENDED",
            "applications": [
                {
                    "id": "APP-TEST-01",
                    "code": "APP-2026-0891",
                    "programName": "M.Tech — Semiconductor",
                    "currentStage": "Under review",
                    "officialOutcome": "Under Scrutiny",
                    "findings": [],
                    "documents": [{"title": "Fire NOC", "category": "Safety"}]
                }
            ],
            "newRulesetClauses": [
                {
                    "clauseNumber": "4.2.b",
                    "title": "Mandatory Safety Buffer Extension",
                    "fullText": "Fire safety certification must carry minimum 12-month post-commencement buffer."
                }
            ]
        })
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        self.assertEqual(data["totalApplicationsTested"], 1)
        self.assertFalse(data["isPublished"])

    def test_reviewpilot_deterministic_prioritization(self):
        apps = [
            {
                "id": "APP-CRIT",
                "code": "APP-2026-0001",
                "programName": "B.Tech AI",
                "currentStage": "Under review",
                "findings": [{"severity": "Critical", "lifecycleStatus": "Open"}],
                "contradictions": [{"severity": "Critical", "status": "Open"}],
                "documents": [{"ocrConfidenceAvg": 75.0}],
                "obligations": [{"status": "Overdue", "dueDate": "2026-10-15"}]
            },
            {
                "id": "APP-CLEAN",
                "code": "APP-2026-0002",
                "programName": "B.Pharm",
                "currentStage": "Ready for review",
                "findings": [],
                "contradictions": [],
                "documents": [{"ocrConfidenceAvg": 98.0}],
                "obligations": [{"status": "Satisfied", "dueDate": "2026-11-30"}]
            }
        ]

        res = self.client.post("/reviewpilot/prioritize", json={"applications": apps})
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["success"])
        items = data["items"]
        self.assertEqual(items[0]["applicationCode"], "APP-2026-0001")
        self.assertGreater(items[0]["priorityScore"], items[1]["priorityScore"])
        self.assertIn("critical", items[0]["explanationText"].lower())

    def test_proofline_manifest_and_chain_verification(self):
        gen_res = self.client.post("/proofline/generate-manifest", json={
            "applicationId": "APP-2026-0842",
            "assessmentId": "ASM-APP-2026-0842-01",
            "documentHashes": [{"title": "Doc1", "sha256": "abc123hash"}],
            "claimReferences": [{"claimKey": "area", "normalizedValue": "10000 sq.m"}],
            "ruleVersionUsed": "APH 2026-27 v2.0",
            "pipelineVersions": {"traceCore": "2.0.0"},
            "normalizedInputs": {"intake": 120},
            "ruleEvaluations": [{"ruleClauseId": "APH-CL-1", "status": "Criteria satisfied"}],
            "previousManifestHash": "0000000000000000000000000000000000000000000000000000000000000000"
        })
        self.assertEqual(gen_res.status_code, 200)
        gen_data = gen_res.json()
        manifest_hash = gen_data["manifestHash"]
        self.assertTrue(len(manifest_hash) == 64)

        # Verify chain with 1 item
        verify_res = self.client.post("/proofline/verify-chain", json={
            "manifestChain": [gen_data]
        })
        self.assertEqual(verify_res.status_code, 200)
        verify_data = verify_res.json()
        self.assertTrue(verify_data["valid"])

    def test_tfidf_document_classifier_and_low_confidence_routing(self):
        # High-confidence Fire NOC text
        res_fire = self.client.post("/system_ml/classify-document", json={
            "text": "Directorate of Maharashtra Fire and Emergency Services Provisional Fire Safety NOC Certificate NBC Part 4 hydrant sprinkler",
            "confidenceThreshold": 0.55
        })
        self.assertEqual(res_fire.status_code, 200)
        data_fire = res_fire.json()
        self.assertEqual(data_fire["predictedCategory"], "Fire & Safety NOC")
        self.assertFalse(data_fire["needsHumanReview"])

        # Low-confidence / out-of-distribution text should route to unknown / needs_review
        res_unk = self.client.post("/system_ml/classify-document", json={
            "text": "random unrelated text xyz 123",
            "confidenceThreshold": 0.85
        })
        self.assertEqual(res_unk.status_code, 200)
        data_unk = res_unk.json()
        self.assertEqual(data_unk["predictedCategory"], "unknown / needs_review")
        self.assertTrue(data_unk["needsHumanReview"])

    def test_held_out_model_evaluation_and_dataset_manager(self):
        # 1. Verify live held-out evaluation returns measured metrics & confusion matrices
        for model_id in ["doc-layout-cnn", "compliance-risk-gbdt", "doc-text-tfidf-logreg"]:
            eval_res = self.client.post(f"/system_ml/models/{model_id}/evaluate")
            self.assertEqual(eval_res.status_code, 200)
            ev = eval_res.json()
            self.assertEqual(ev["modelId"], model_id)
            self.assertGreater(ev["evaluatedSamples"], 0)
            self.assertGreaterEqual(ev["accuracy"], 0.70)
            self.assertIn("confusionMatrix", ev)
            self.assertTrue(isinstance(ev["confusionMatrix"], list))
            self.assertGreater(len(ev["confusionMatrix"]), 0)
            self.assertIn("Experimental Prototype", ev["validationStatus"])

        # 2. Verify executable dataset manager status & manifest (< 850 MiB working limit)
        import subprocess
        import json
        res_proc = subprocess.run(
            [sys.executable, "scripts/datasets.py", "status"],
            capture_output=True,
            text=True,
            check=True,
        )
        status_json = json.loads(res_proc.stdout)
        self.assertEqual(status_json["command"], "status")
        self.assertTrue(status_json["within_working_limit"])
        self.assertTrue(status_json["within_hard_limit"])
        self.assertLess(status_json["retained_size_mib"], 850.0)
        self.assertIn("funsd", status_json["datasets"])
        self.assertIn("trace-regulatory-synth", status_json["datasets"])

if __name__ == "__main__":
    unittest.main()
