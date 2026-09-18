import os
import sys
import json
import csv
import numpy as np
import pandas as pd
from pathlib import Path
from ultralytics import YOLO

# Add parent directory to sys.path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from src.config import (
    MODEL, DEVICE, IMAGE_SIZE, CONFIDENCE_THRESHOLD, IOU_THRESHOLD,
    BASE_DIR, RESULTS_DIR
)


def compute_mask_iou(mask1: np.ndarray, mask2: np.ndarray) -> float:
    """Compute Intersection over Union (IoU) between two binary masks."""
    intersection = np.logical_and(mask1 > 0, mask2 > 0).sum()
    union = np.logical_or(mask1 > 0, mask2 > 0).sum()
    if union == 0:
        return 0.0
    return float(intersection / union)


def evaluate_instance_masks_custom(gt_instances_by_img: dict, pred_instances_by_img: dict, iou_thresh: float = 0.5):
    """
    Custom IoU instance mask evaluator for matching predictions against ground truth.
    Computes TP, FP, FN, Precision, Recall, F1, and Mean IoU.
    """
    total_tp = 0
    total_fp = 0
    total_fn = 0
    matched_ious = []

    for img_name, gt_instances in gt_instances_by_img.items():
        pred_instances = pred_instances_by_img.get(img_name, [])

        if not gt_instances and not pred_instances:
            continue

        if not gt_instances:
            total_fp += len(pred_instances)
            continue

        if not pred_instances:
            total_fn += len(gt_instances)
            continue

        # Build IoU matrix [num_preds, num_gts]
        num_preds = len(pred_instances)
        num_gts = len(gt_instances)
        iou_matrix = np.zeros((num_preds, num_gts), dtype=np.float32)

        for p_idx, pred in enumerate(pred_instances):
            p_mask = pred["mask"]
            p_cls = pred["class_id"]

            for g_idx, gt in enumerate(gt_instances):
                g_mask = gt["mask"]
                g_cls = gt["class_id"]

                # Only match if class matches (or class-agnostic matching if specified)
                if p_cls == g_cls:
                    iou_matrix[p_idx, g_idx] = compute_mask_iou(p_mask, g_mask)
                else:
                    iou_matrix[p_idx, g_idx] = 0.0

        # Greedy matching by highest IoU
        matched_gt_indices = set()
        matched_pred_indices = set()

        # Flatten and sort IoU entries descending
        matches = []
        for p_idx in range(num_preds):
            for g_idx in range(num_gts):
                if iou_matrix[p_idx, g_idx] >= iou_thresh:
                    matches.append((iou_matrix[p_idx, g_idx], p_idx, g_idx))

        matches.sort(key=lambda x: x[0], reverse=True)

        for iou_val, p_idx, g_idx in matches:
            if p_idx not in matched_pred_indices and g_idx not in matched_gt_indices:
                matched_pred_indices.add(p_idx)
                matched_gt_indices.add(g_idx)
                total_tp += 1
                matched_ious.append(iou_val)

        total_fp += (num_preds - len(matched_pred_indices))
        total_fn += (num_gts - len(matched_gt_indices))

    precision = total_tp / (total_tp + total_fp) if (total_tp + total_fp) > 0 else 0.0
    recall = total_tp / (total_tp + total_fn) if (total_tp + total_fn) > 0 else 0.0
    f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
    mean_iou = float(np.mean(matched_ious)) if matched_ious else 0.0

    return {
        "true_positives": total_tp,
        "false_positives": total_fp,
        "false_negatives": total_fn,
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
        "mean_iou": round(mean_iou, 4)
    }


def evaluate_baseline_model(
    model_path: str = None,
    dataset_yaml: str = None
):
    print("==================================================")
    print("TRASHTRACE BASELINE EVALUATION & SENSITIVITY CHECK")
    print("==================================================")

    if model_path is None:
        model_path = RESULTS_DIR / "training" / "baseline_yolo26n" / "weights" / "best.pt"
        if not model_path.exists():
            model_path = BASE_DIR / MODEL

    if dataset_yaml is None:
        dataset_yaml = BASE_DIR / "dataset" / "combined" / "dataset.yaml"

    print(f"Loading trained model: {model_path}")
    model = YOLO(str(model_path))

    metrics_out_dir = RESULTS_DIR / "metrics"
    metrics_out_dir.mkdir(parents=True, exist_ok=True)

    # 1. Ultralytics Evaluation on Validation and Test Sets
    results_summary = {}

    for split in ["val", "test"]:
        print(f"\n---> Evaluating on {split.upper()} set (split='{split}', conf={CONFIDENCE_THRESHOLD})...")
        val_metrics = model.val(
            data=str(dataset_yaml),
            split=split,
            imgsz=IMAGE_SIZE,
            conf=CONFIDENCE_THRESHOLD,
            device=DEVICE,
            project=str(RESULTS_DIR / "runs"),
            name=f"eval_{split}",
            exist_ok=True
        )

        mp = val_metrics.seg.map50 if hasattr(val_metrics, 'seg') else 0.0
        mp_50_95 = val_metrics.seg.map if hasattr(val_metrics, 'seg') else 0.0
        p = float(np.mean(val_metrics.seg.p)) if hasattr(val_metrics, 'seg') and len(val_metrics.seg.p) > 0 else 0.0
        r = float(np.mean(val_metrics.seg.r)) if hasattr(val_metrics, 'seg') and len(val_metrics.seg.r) > 0 else 0.0
        f1 = (2 * p * r) / (p + r) if (p + r) > 0 else 0.0

        per_class_seg = {}
        if hasattr(val_metrics, 'seg') and hasattr(val_metrics, 'names'):
            names = val_metrics.names
            for c_id, c_name in names.items():
                if c_id < len(val_metrics.seg.p):
                    per_class_seg[c_name] = {
                        "precision": round(float(val_metrics.seg.p[c_id]), 4),
                        "recall": round(float(val_metrics.seg.r[c_id]), 4),
                        "mAP50": round(float(val_metrics.seg.maps[c_id]), 4) if hasattr(val_metrics.seg, 'maps') else 0.0
                    }

        results_summary[split] = {
            "mask_mAP50": round(float(mp), 4),
            "mask_mAP50_95": round(float(mp_50_95), 4),
            "precision": round(float(p), 4),
            "recall": round(float(r), 4),
            "f1": round(float(f1), 4),
            "per_class": per_class_seg
        }

        print(f"  [{split.upper()} RESULTS]")
        print(f"  Mask mAP50: {mp:.4f} | Mask mAP50-95: {mp_50_95:.4f}")
        print(f"  Precision:  {p:.4f} | Recall: {r:.4f} | F1: {f1:.4f}")

    # 2. Confidence Threshold Sensitivity Analysis on Validation Set
    print("\n---> Running Confidence Sensitivity Analysis on Validation Set...")
    sensitivity_results = {}
    for conf_val in [0.20, 0.25, 0.35, 0.50]:
        val_res = model.val(
            data=str(dataset_yaml),
            split="val",
            imgsz=IMAGE_SIZE,
            conf=conf_val,
            device=DEVICE,
            verbose=False
        )
        mp = val_res.seg.map50 if hasattr(val_res, 'seg') else 0.0
        p = float(np.mean(val_res.seg.p)) if hasattr(val_res, 'seg') and len(val_res.seg.p) > 0 else 0.0
        r = float(np.mean(val_res.seg.r)) if hasattr(val_res, 'seg') and len(val_res.seg.r) > 0 else 0.0
        f1 = (2 * p * r) / (p + r) if (p + r) > 0 else 0.0

        sensitivity_results[f"conf_{conf_val:.2f}"] = {
            "conf": conf_val,
            "mask_mAP50": round(float(mp), 4),
            "precision": round(float(p), 4),
            "recall": round(float(r), 4),
            "f1": round(float(f1), 4)
        }
        print(f"  conf={conf_val:.2f} -> Precision: {p:.4f}, Recall: {r:.4f}, F1: {f1:.4f}, mAP50: {mp:.4f}")

    # Export baseline metrics to JSON and CSV
    json_path = metrics_out_dir / "baseline_metrics.json"
    csv_path = metrics_out_dir / "baseline_metrics.csv"

    full_output = {
        "evaluation_summary": results_summary,
        "confidence_sensitivity_val": sensitivity_results
    }

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(full_output, f, indent=2)

    # Flatten for CSV
    csv_rows = []
    for split, m in results_summary.items():
        csv_rows.append({
            "split": split,
            "conf": CONFIDENCE_THRESHOLD,
            "mask_mAP50": m["mask_mAP50"],
            "mask_mAP50_95": m["mask_mAP50_95"],
            "precision": m["precision"],
            "recall": m["recall"],
            "f1": m["f1"]
        })
    df_metrics = pd.DataFrame(csv_rows)
    df_metrics.to_csv(csv_path, index=False)

    print(f"\nSaved baseline evaluation JSON to: {json_path}")
    print(f"Saved baseline evaluation CSV to: {csv_path}")
    print("==================================================\n")

    return full_output


if __name__ == "__main__":
    evaluate_baseline_model()
