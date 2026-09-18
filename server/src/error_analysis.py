import os
import sys
import pickle
import json
import cv2
import numpy as np
from pathlib import Path

# Add parent directory to sys.path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from src.config import BASE_DIR, RESULTS_DIR


def compute_mask_iou(mask1: np.ndarray, mask2: np.ndarray) -> float:
    intersection = np.logical_and(mask1 > 0, mask2 > 0).sum()
    union = np.logical_or(mask1 > 0, mask2 > 0).sum()
    if union == 0:
        return 0.0
    return float(intersection / union)


def load_gt_for_image(img_path: Path, label_dir: Path, orig_w: int, orig_h: int) -> list:
    lbl_path = label_dir / f"{img_path.stem}.txt"
    if not lbl_path.exists():
        return []

    gt_list = []
    with open(lbl_path, "r", encoding="utf-8") as f:
        lines = [l.strip() for l in f.readlines() if l.strip()]

    for line_idx, line in enumerate(lines):
        parts = line.split()
        if len(parts) < 7 or (len(parts) - 1) % 2 != 0:
            continue

        cls_id = int(float(parts[0]))
        coords = [float(x) for x in parts[1:]]

        pts = []
        for i in range(0, len(coords), 2):
            px = int(round(coords[i] * orig_w))
            py = int(round(coords[i + 1] * orig_h))
            pts.append([px, py])

        pts_arr = np.array(pts, dtype=np.int32)
        mask = np.zeros((orig_h, orig_w), dtype=np.uint8)
        cv2.fillPoly(mask, [pts_arr], 1)

        gt_list.append({
            "gt_id": line_idx + 1,
            "class_id": cls_id,
            "mask": mask,
            "area": int(mask.sum())
        })

    return gt_list


def analyze_baseline_errors():
    print("==================================================")
    print("RUNNING QUALITATIVE & QUANTITATIVE ERROR ANALYSIS")
    print("==================================================")

    test_img_dir = BASE_DIR / "dataset" / "combined" / "images" / "test"
    test_lbl_dir = BASE_DIR / "dataset" / "combined" / "labels" / "test"
    raw_pred_dir = RESULTS_DIR / "raw_predictions" / "test"

    out_error_dir = RESULTS_DIR / "error_analysis"
    out_error_dir.mkdir(parents=True, exist_ok=True)

    error_counts = {
        "A_missed_detection": 0,
        "B_false_positive": 0,
        "C_incorrect_class": 0,
        "D_merged_instance": 0,
        "E_fragmented_mask": 0,
        "F_poor_mask_boundary": 0,
        "G_small_object_failure": 0,
        "H_partial_occlusion_failure": 0,
        "I_heavy_clutter_failure": 0
    }

    image_extensions = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
    test_files = [f for f in test_img_dir.iterdir() if f.is_file() and f.suffix.lower() in image_extensions]

    categorized_samples = []

    for img_path in test_files:
        pkl_path = raw_pred_dir / f"{img_path.stem}_raw.pkl"
        if not pkl_path.exists():
            continue

        with open(pkl_path, "rb") as f:
            raw_entry = pickle.load(f)

        orig_w = raw_entry["orig_width"]
        orig_h = raw_entry["orig_height"]
        preds = raw_entry["instances"]

        gts = load_gt_for_image(img_path, test_lbl_dir, orig_w, orig_h)

        img_errors = []

        # Check Heavy Clutter
        if len(gts) >= 4:
            error_counts["I_heavy_clutter_failure"] += 1
            img_errors.append("I_heavy_clutter_failure")

        # Evaluate Ground Truths vs Predictions
        gt_matched_preds = {g_idx: [] for g_idx in range(len(gts))}
        pred_matched_gts = {p_idx: [] for p_idx in range(len(preds))}

        for p_idx, p in enumerate(preds):
            for g_idx, g in enumerate(gts):
                iou = compute_mask_iou(p["mask"], g["mask"])
                if iou >= 0.15:
                    gt_matched_preds[g_idx].append((p_idx, iou, p["class_id"] == g["class_id"]))
                    pred_matched_gts[p_idx].append((g_idx, iou, p["class_id"] == g["class_id"]))

        # A: Missed Detection & G: Small Object Failure
        for g_idx, g in enumerate(gts):
            matches = gt_matched_preds[g_idx]
            if not matches:
                error_counts["A_missed_detection"] += 1
                img_errors.append("A_missed_detection")
                if g["area"] < 1500:
                    error_counts["G_small_object_failure"] += 1
                    img_errors.append("G_small_object_failure")
            elif len(matches) > 1:
                # E: Fragmented mask / split prediction for single GT
                error_counts["E_fragmented_mask"] += 1
                img_errors.append("E_fragmented_mask")

        # B: False Positive & D: Merged Instance & C: Incorrect Class & F: Poor Boundary
        for p_idx, p in enumerate(preds):
            matches = pred_matched_gts[p_idx]
            if not matches:
                error_counts["B_false_positive"] += 1
                img_errors.append("B_false_positive")
            elif len(matches) > 1:
                # D: Merged instance (one prediction matches multiple GTs)
                error_counts["D_merged_instance"] += 1
                img_errors.append("D_merged_instance")
            else:
                g_idx, iou, class_correct = matches[0]
                if not class_correct:
                    error_counts["C_incorrect_class"] += 1
                    img_errors.append("C_incorrect_class")
                elif 0.15 <= iou < 0.50:
                    error_counts["F_poor_mask_boundary"] += 1
                    img_errors.append("F_poor_mask_boundary")

        if img_errors:
            categorized_samples.append({
                "image": img_path.name,
                "errors": list(set(img_errors)),
                "num_gts": len(gts),
                "num_preds": len(preds)
            })

            # Save visual error artifact for representative images
            img_bgr = cv2.imread(str(img_path))
            if img_bgr is not None:
                # Draw GT in blue, Pred in red
                for g in gts:
                    contours, _ = cv2.findContours(g["mask"], cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                    cv2.drawContours(img_bgr, contours, -1, (255, 0, 0), 2)
                for p in preds:
                    contours, _ = cv2.findContours(p["mask"], cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                    cv2.drawContours(img_bgr, contours, -1, (0, 0, 255), 2)

                err_label = "_".join(list(set(img_errors))[:2])
                out_path = out_error_dir / f"err_{err_label}_{img_path.name}"
                cv2.imwrite(str(out_path), img_bgr)

    # Save summary report
    summary_path = out_error_dir / "error_summary.json"
    with open(summary_path, "w", encoding="utf-8") as f:
        json.dump({
            "error_category_counts": error_counts,
            "flagged_images": categorized_samples
        }, f, indent=2)

    print("\n--- ERROR ANALYSIS CATEGORY COUNTS ---")
    for cat, count in error_counts.items():
        print(f"  {cat}: {count}")

    print(f"\nSaved error analysis summary to: {summary_path}")
    print(f"Saved qualitative error visuals to: {out_error_dir}")
    print("==================================================\n")


if __name__ == "__main__":
    analyze_baseline_errors()
