import os
import sys
import random
import cv2
import numpy as np
import yaml
from pathlib import Path

# Add parent directory to sys.path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from src.config import BASE_DIR, RESULTS_DIR

# Define harmonious color palette for classes
CLASS_COLORS = [
    (0, 255, 127),   # Spring Green (plastic - 0)
    (255, 191, 0),   # Deep Sky Blue (metal - 1)
    (255, 105, 180), # Hot Pink (paper_cardboard - 2)
    (0, 215, 255),   # Gold / Cyan (glass - 3)
    (147, 112, 219)  # Purple (other - 4)
]


def load_dataset_classes():
    yaml_path = BASE_DIR / "dataset" / "combined" / "dataset.yaml"
    if not yaml_path.exists():
        yaml_path = BASE_DIR / "dataset" / "normal" / "waste_dataset.yaml"
    with open(yaml_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    return data.get("names", {})


def draw_ground_truth(img: np.ndarray, label_path: Path, class_names: dict) -> np.ndarray:
    """Draw ground-truth polygons, masks, and class text onto image."""
    h, w, _ = img.shape
    overlay = img.copy()

    if not label_path.exists():
        return img

    with open(label_path, "r", encoding="utf-8") as f:
        lines = [line.strip() for line in f.readlines() if line.strip()]

    for line in lines:
        parts = line.split()
        if len(parts) < 7 or (len(parts) - 1) % 2 != 0:
            continue

        cls_id = int(float(parts[0]))
        coords = [float(x) for x in parts[1:]]

        # Convert normalized coordinates to pixel coordinates
        points = []
        for i in range(0, len(coords), 2):
            px = int(round(coords[i] * w))
            py = int(round(coords[i + 1] * h))
            points.append([px, py])

        pts_arr = np.array(points, dtype=np.int32)

        color = CLASS_COLORS[cls_id % len(CLASS_COLORS)]

        # Fill mask polygon with semi-transparent overlay
        cv2.fillPoly(overlay, [pts_arr], color)

        # Draw polygon boundary
        cv2.polylines(img, [pts_arr], isClosed=True, color=color, thickness=2)

        # Class text at top-left vertex of polygon
        top_left = points[np.argmin([p[1] for p in points])]
        tx, ty = top_left[0], max(15, top_left[1] - 5)
        cls_name = class_names.get(cls_id, str(cls_id))

        cv2.putText(
            img, cls_name, (tx, ty),
            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2, cv2.LINE_AA
        )
        cv2.putText(
            img, cls_name, (tx, ty),
            cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1, cv2.LINE_AA
        )

    # Blend transparent overlay with original image
    alpha = 0.35
    result = cv2.addWeighted(overlay, alpha, img, 1 - alpha, 0)
    return result


def visualize_dataset_samples(num_samples: int = 15):
    print("==================================================")
    print("GENERATING GROUND-TRUTH VISUALIZATION SAMPLES")
    print("==================================================")

    combined_base = BASE_DIR / "dataset" / "combined"
    if not combined_base.exists():
        combined_base = BASE_DIR / "dataset" / "normal"

    class_names = load_dataset_classes()

    output_dir = RESULTS_DIR / "dataset_samples"
    output_dir.mkdir(parents=True, exist_ok=True)

    image_extensions = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}

    all_samples = []
    for split in ["train", "val", "test"]:
        img_dir = combined_base / "images" / split
        lbl_dir = combined_base / "labels" / split
        if not img_dir.exists():
            continue
        for f in img_dir.iterdir():
            if f.is_file() and f.suffix.lower() in image_extensions:
                lbl_file = lbl_dir / f"{f.stem}.txt"
                if lbl_file.exists():
                    all_samples.append((f, lbl_file, split))

    if not all_samples:
        print("ERROR: No valid image-label pairs found for visualization!")
        return

    # Seed for reproducibility
    random.seed(42)
    selected = random.sample(all_samples, min(num_samples, len(all_samples)))

    saved_files = []
    for idx, (img_path, lbl_path, split) in enumerate(selected, 1):
        img = cv2.imread(str(img_path))
        if img is None:
            continue

        annotated_img = draw_ground_truth(img, lbl_path, class_names)
        out_filename = f"sample_{idx:02d}_{split}_{img_path.name}"
        out_path = output_dir / out_filename
        cv2.imwrite(str(out_path), annotated_img)
        saved_files.append(out_path)
        print(f"[✓] Saved GT visual ({idx}/{len(selected)}): {out_filename}")

    print(f"\nSuccessfully saved {len(saved_files)} ground-truth samples to: {output_dir}")
    print("==================================================\n")


if __name__ == "__main__":
    visualize_dataset_samples()
