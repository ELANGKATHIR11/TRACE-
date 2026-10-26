import os
import sys
import json
import time

os.environ["KMP_DUPLICATE_LIB_OK"] = "TRUE"

def levenshtein_distance(s1: str, s2: str) -> int:
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)
    prev = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        curr = [i + 1]
        for j, c2 in enumerate(s2):
            insert = prev[j + 1] + 1
            delete = curr[j] + 1
            sub = prev[j] + (0 if c1 == c2 else 1)
            curr.append(min(insert, delete, sub))
        prev = curr
    return prev[-1]

def evaluate_cer_wer(ref: str, hyp: str):
    ref_clean = " ".join(ref.strip().split())
    hyp_clean = " ".join(hyp.strip().split())
    
    # Character Error Rate (CER)
    cer_dist = levenshtein_distance(ref_clean, hyp_clean)
    cer = cer_dist / max(len(ref_clean), 1)
    
    # Word Error Rate (WER)
    ref_words = ref_clean.split()
    hyp_words = hyp_clean.split()
    
    # word level Levenshtein
    w_prev = range(len(hyp_words) + 1)
    for i, w1 in enumerate(ref_words):
        w_curr = [i + 1]
        for j, w2 in enumerate(hyp_words):
            ins = w_prev[j + 1] + 1
            d = w_curr[j] + 1
            sub = w_prev[j] + (0 if w1 == w2 else 1)
            w_curr.append(min(ins, d, sub))
        w_prev = w_curr
    wer_dist = w_prev[-1]
    wer = wer_dist / max(len(ref_words), 1)
    
    return cer, wer, len(ref_clean), cer_dist, len(ref_words), wer_dist

def run_funsd_ocr_evaluation(sample_count: int = 15):
    """
    Renders and evaluates OCR (EasyOCR on GPU/CPU) against ground-truth FUNSD annotations.
    Computes real Character Error Rate (CER) and Word Error Rate (WER).
    """
    funsd_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "datasets", "funsd")
    splits_file = os.path.join(funsd_dir, "prepared_splits.json")
    
    if not os.path.exists(splits_file):
        raise FileNotFoundError("FUNSD prepared_splits.json not found.")
        
    with open(splits_file, "r", encoding="utf-8") as f:
        splits_data = json.load(f)
        
    test_rel_files = splits_data.get("splits", {}).get("test", [])
    if not test_rel_files:
        raise ValueError("No test split files found in FUNSD splits.")
        
    selected_files = test_rel_files[:sample_count]
    
    import torch
    import easyocr
    from PIL import Image
    import numpy as np
    
    # Use CPU reader directly to avoid the RTX 5060 Blackwell PyTorch VMM/CRAFT allocation conflict
    use_gpu = False
    reader = easyocr.Reader(['en'], gpu=False, verbose=False)
    
    results = []
    total_cer_dist = 0
    total_ref_chars = 0
    total_wer_dist = 0
    total_ref_words = 0
    t0 = time.time()
    
    for rel_ann in selected_files:
        ann_path = os.path.join(funsd_dir, rel_ann)
        # Corresponding image path
        img_rel = os.path.join(
            os.path.dirname(os.path.dirname(rel_ann)),
            "images",
            os.path.splitext(os.path.basename(rel_ann))[0] + ".png"
        )
        img_path = os.path.join(funsd_dir, img_rel)
        if not os.path.exists(img_path):
            continue
            
        with open(ann_path, "r", encoding="utf-8") as af:
            ann_data = json.load(af)
            
        # Ground-truth text
        gt_texts = [item.get("text", "") for item in ann_data.get("form", []) if item.get("text", "").strip()]
        gt_full = " ".join(gt_texts)
        if not gt_full.strip():
            continue
            
        # Load via PIL to ensure RGB numpy array without OpenCV encoding pitfalls
        pil_im = Image.open(img_path).convert("RGB")
        np_im = np.array(pil_im)

        # Run EasyOCR
        t_doc_start = time.time()
        ocr_out = reader.readtext(np_im)
        doc_time = time.time() - t_doc_start
        
        hyp_texts = [box_res[1] for box_res in ocr_out if box_res[1].strip()]
        hyp_full = " ".join(hyp_texts)
        
        cer, wer, ref_chars, c_dist, ref_words, w_dist = evaluate_cer_wer(gt_full, hyp_full)
        total_cer_dist += c_dist
        total_ref_chars += ref_chars
        total_wer_dist += w_dist
        total_ref_words += ref_words
        
        results.append({
            "file": os.path.basename(img_path),
            "cer": round(cer, 4),
            "wer": round(wer, 4),
            "refChars": ref_chars,
            "refWords": ref_words,
            "recognizedWords": len(hyp_words := hyp_full.split()),
            "inferenceTimeSec": round(doc_time, 2)
        })
        
    overall_cer = total_cer_dist / max(total_ref_chars, 1)
    overall_wer = total_wer_dist / max(total_ref_words, 1)
    
    eval_report = {
        "benchmark": "FUNSD (Form Understanding in Noisy Scanned Documents)",
        "datasetSplit": "Held-Out Test Split (Forms not seen in training)",
        "evaluatedDocumentsCount": len(results),
        "hardwareAccelerator": torch.cuda.get_device_name(0) if use_gpu else "CPU Host",
        "cudaEnabled": use_gpu,
        "overallCER": round(overall_cer, 4),
        "overallWER": round(overall_wer, 4),
        "characterAccuracy": round(max(0.0, 1.0 - overall_cer), 4),
        "wordAccuracy": round(max(0.0, 1.0 - overall_wer), 4),
        "totalReferenceChars": total_ref_chars,
        "totalReferenceWords": total_ref_words,
        "evaluationDurationSec": round(time.time() - t0, 2),
        "sampleBreakdown": results,
        "status": "Measured on Real Noisy Scanned Forms",
        "statutoryCaveat": "Benchmarked on historical noisy forms; performance will vary on clean digital vector PDF submissions."
    }
    
    out_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "fastapi_engine", "models", "funsd_ocr_evaluation.json")
    with open(out_path, "w", encoding="utf-8") as out_f:
        json.dump(eval_report, out_f, indent=2)
        
    return eval_report

if __name__ == "__main__":
    count = int(sys.argv[1]) if len(sys.argv) > 1 else 10
    print(f"[*] Running EasyOCR Benchmark on {count} held-out FUNSD test forms...")
    report = run_funsd_ocr_evaluation(count)
    print(f"[OK] Completed evaluation on {report['evaluatedDocumentsCount']} documents.")
    print(f"     Overall CER (Character Error Rate): {report['overallCER'] * 100:.2f}% (Acc: {report['characterAccuracy'] * 100:.2f}%)")
    print(f"     Overall WER (Word Error Rate):      {report['overallWER'] * 100:.2f}% (Acc: {report['wordAccuracy'] * 100:.2f}%)")
    print(f"     Hardware Utilized:                  {report['hardwareAccelerator']}")
