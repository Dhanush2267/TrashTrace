import os
import sys
import pickle
import json
import csv
import time
import cv2
import numpy as np
import pandas as pd
from pathlib import Path

# Add parent directory to sys.path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from src.config import BASE_DIR, RESULTS_DIR
from src.postprocess import postprocess_instances, apply_mask_overlay
from src.evaluate import evaluate_instance_masks_custom
from src.error_analysis import load_gt_for_image


CLASS_COLORS = [
    (0, 255, 127),   # plastic - spring green
    (255, 191, 0),   # metal - amber
    (255, 105, 180), # paper - pink
    (0, 215, 255),   # glass - cyan
    (147, 112, 219)  # other - purple
]


def render_instances_overlay(img: np.ndarray, instances: list) -> np.ndarray:
    """Render instance masks and bounding boxes on an image."""
    canvas = img.copy()
    overlay = img.copy()
    h, w = canvas.shape[:2]

    for inst in instances:
        mask = inst["mask"]
        cls_id = inst["class_id"]
        cls_name = inst.get("class_name", str(cls_id))
        conf = inst.get("confidence", 1.0)
        bbox = inst.get("bbox", None)

        color = CLASS_COLORS[cls_id % len(CLASS_COLORS)]

        # Fill mask
        overlay[mask > 0] = color

        # Polygon contour
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        cv2.drawContours(canvas, contours, -1, color, 2)

        # Bounding box & text
        if bbox is not None:
            bx1, by1, bx2, by2 = [int(v) for v in bbox]
            cv2.rectangle(canvas, (bx1, by1), (bx2, by2), color, 1)
            txt = f"{cls_name} {conf:.2f}"
            cv2.putText(canvas, txt, (bx1, max(15, by1 - 5)), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 2)
            cv2.putText(canvas, txt, (bx1, max(15, by1 - 5)), cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 1)

    alpha = 0.4
    blended = cv2.addWeighted(overlay, alpha, canvas, 1 - alpha, 0)
    return blended


def run_ablation_study():
    print("==================================================")
    print("RUNNING 4-WAY ABLATION STUDY & INSTANCE SEPARATION")
    print("==================================================")

    test_img_dir = BASE_DIR / "dataset" / "combined" / "images" / "test"
    test_lbl_dir = BASE_DIR / "dataset" / "combined" / "labels" / "test"
    raw_pred_dir = RESULTS_DIR / "raw_predictions" / "test"

    ablation_visuals_dir = RESULTS_DIR / "ablation_visuals"
    metrics_dir = RESULTS_DIR / "metrics"

    ablation_visuals_dir.mkdir(parents=True, exist_ok=True)
    metrics_dir.mkdir(parents=True, exist_ok=True)

    image_extensions = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
    test_files = [f for f in test_img_dir.iterdir() if f.is_file() and f.suffix.lower() in image_extensions]

    # Load Ground Truths and Raw Predictions for all test images
    gt_by_img = {}
    raw_preds_by_img = {}

    for img_path in test_files:
        pkl_path = raw_pred_dir / f"{img_path.stem}_raw.pkl"
        if not pkl_path.exists():
            continue

        with open(pkl_path, "rb") as f:
            raw_entry = pickle.load(f)

        orig_w = raw_entry["orig_width"]
        orig_h = raw_entry["orig_height"]

        gt_list = load_gt_for_image(img_path, test_lbl_dir, orig_w, orig_h)
        gt_by_img[img_path.name] = gt_list
        raw_preds_by_img[img_path.name] = raw_entry["instances"]

    experiments = [
        ("Experiment A (Baseline YOLO26n-Seg)", "none"),
        ("Experiment B (+ Selective Watershed)", "watershed"),
        ("Experiment C (+ Morphological Refinement)", "morphology"),
        ("Experiment D (Full Pipeline: Watershed + Morphology)", "full")
    ]

    ablation_results = []
    processed_predictions = {exp_code: {} for _, exp_code in experiments}
    postprocess_times = {exp_code: 0.0 for _, exp_code in experiments}
    instance_counts = {exp_code: 0 for _, exp_code in experiments}

    for exp_title, exp_mode in experiments:
        print(f"\n---> Running {exp_title}...")
        preds_for_exp = {}

        t0 = time.time()
        for img_name, raw_instances in raw_preds_by_img.items():
            # Process instances
            proc_insts = postprocess_instances(raw_instances, mode=exp_mode)
            preds_for_exp[img_name] = proc_insts
            instance_counts[exp_mode] += len(proc_insts)

        elapsed = time.time() - t0
        postprocess_times[exp_mode] = elapsed

        processed_predictions[exp_mode] = preds_for_exp

        # Evaluate against Ground Truth
        eval_metrics = evaluate_instance_masks_custom(gt_by_img, preds_for_exp, iou_thresh=0.5)

        res_entry = {
            "experiment": exp_title,
            "mode": exp_mode,
            "precision": eval_metrics["precision"],
            "recall": eval_metrics["recall"],
            "f1": eval_metrics["f1"],
            "mean_iou": eval_metrics["mean_iou"],
            "true_positives": eval_metrics["true_positives"],
            "false_positives": eval_metrics["false_positives"],
            "false_negatives": eval_metrics["false_negatives"],
            "total_predicted_instances": instance_counts[exp_mode],
            "postprocess_time_sec": round(elapsed, 4)
        }
        ablation_results.append(res_entry)

        print(f"  Precision: {eval_metrics['precision']:.4f} | Recall: {eval_metrics['recall']:.4f} | F1: {eval_metrics['f1']:.4f}")
        print(f"  Mean IoU:  {eval_metrics['mean_iou']:.4f} | Total Detected Instances: {instance_counts[exp_mode]}")

    # Export Ablation Results JSON and CSV
    json_path = metrics_dir / "ablation_results.json"
    csv_path = metrics_dir / "ablation_results.csv"

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(ablation_results, f, indent=2)

    df_ablation = pd.DataFrame(ablation_results)
    df_ablation.to_csv(csv_path, index=False)

    print(f"\nSaved ablation metrics to: {json_path}")
    print(f"Saved ablation CSV to: {csv_path}")

    # 2. Instance Separation Analysis CSV
    total_gt_instances = sum(len(gts) for gts in gt_by_img.values())

    sep_rows = []
    for img_name in gt_by_img.keys():
        num_gt = len(gt_by_img[img_name])
        num_base = len(processed_predictions["none"].get(img_name, []))
        num_ws = len(processed_predictions["watershed"].get(img_name, []))
        num_morph = len(processed_predictions["morphology"].get(img_name, []))
        num_full = len(processed_predictions["full"].get(img_name, []))

        sep_rows.append({
            "image": img_name,
            "GT_instances": num_gt,
            "Baseline_instances": num_base,
            "Watershed_instances": num_ws,
            "Morphology_instances": num_morph,
            "FullPipeline_instances": num_full,
            "Watershed_split_diff": num_ws - num_base,
            "Full_split_diff": num_full - num_base
        })

    sep_csv_path = metrics_dir / "instance_separation.csv"
    df_sep = pd.DataFrame(sep_rows)
    df_sep.to_csv(sep_csv_path, index=False)
    print(f"Saved instance separation analysis to: {sep_csv_path}")

    # 3. Side-by-Side Visual Comparison Generation
    print("\n---> Generating 5-Panel Side-by-Side Visual Comparisons...")
    visual_count = 0
    for img_path in test_files:
        img_name = img_path.name
        img = cv2.imread(str(img_path))
        if img is None:
            continue

        h, w = img.shape[:2]
        # Resize panels for side-by-side grid
        target_h = 360
        target_w = int(w * (target_h / h))

        def prep_panel(panel_img, title):
            res = cv2.resize(panel_img, (target_w, target_h))
            cv2.rectangle(res, (0, 0), (target_w, 25), (0, 0, 0), -1)
            cv2.putText(res, title, (5, 18), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1, cv2.LINE_AA)
            return res

        # Panel 1: Original Image
        p1 = prep_panel(img.copy(), "1. Original")

        # Panel 2: Baseline YOLO
        p2_raw = render_instances_overlay(img, processed_predictions["none"].get(img_name, []))
        p2 = prep_panel(p2_raw, "2. Baseline YOLO")

        # Panel 3: + Watershed
        p3_raw = render_instances_overlay(img, processed_predictions["watershed"].get(img_name, []))
        p3 = prep_panel(p3_raw, "3. + Watershed")

        # Panel 4: + Morphology
        p4_raw = render_instances_overlay(img, processed_predictions["morphology"].get(img_name, []))
        p4 = prep_panel(p4_raw, "4. + Morphology")

        # Panel 5: Full Pipeline
        p5_raw = render_instances_overlay(img, processed_predictions["full"].get(img_name, []))
        p5 = prep_panel(p5_raw, "5. Full Pipeline")

        # Combine into side-by-side strip
        side_by_side = np.hstack([p1, p2, p3, p4, p5])

        out_vis_path = ablation_visuals_dir / f"ablation_{img_name}"
        cv2.imwrite(str(out_vis_path), side_by_side)
        visual_count += 1

    print(f"Saved {visual_count} side-by-side visual comparisons to: {ablation_visuals_dir}")
    print("==================================================\n")


if __name__ == "__main__":
    run_ablation_study()
