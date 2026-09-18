import os
import sys
import pickle
import cv2
import numpy as np
from pathlib import Path
from ultralytics import YOLO

# Add parent directory to sys.path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from src.config import (
    MODEL, DEVICE, IMAGE_SIZE, CONFIDENCE_THRESHOLD,
    BASE_DIR, RESULTS_DIR
)


def cache_raw_test_predictions(
    model_path: str = None,
    test_img_dir: str = None
):
    print("==================================================")
    print("CACHING RAW TEST PREDICTIONS FOR ABLATION STUDIES")
    print("==================================================")

    if model_path is None:
        model_path = RESULTS_DIR / "training" / "baseline_yolo26n" / "weights" / "best.pt"
        if not model_path.exists():
            model_path = BASE_DIR / MODEL

    if test_img_dir is None:
        test_img_dir = BASE_DIR / "dataset" / "combined" / "images" / "test"
    else:
        test_img_dir = Path(test_img_dir)

    print(f"Model: {model_path}")
    print(f"Test Image Directory: {test_img_dir}")

    cache_out_dir = RESULTS_DIR / "raw_predictions" / "test"
    cache_out_dir.mkdir(parents=True, exist_ok=True)

    model = YOLO(str(model_path))

    image_extensions = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
    test_files = [f for f in test_img_dir.iterdir() if f.is_file() and f.suffix.lower() in image_extensions]

    print(f"Found {len(test_files)} test images to predict & cache.")

    cached_count = 0
    for idx, img_path in enumerate(test_files, 1):
        # Read image to get exact original dimensions
        img = cv2.imread(str(img_path))
        if img is None:
            continue
        orig_h, orig_w = img.shape[:2]

        results = model.predict(
            source=str(img_path),
            device=DEVICE,
            imgsz=IMAGE_SIZE,
            conf=CONFIDENCE_THRESHOLD,
            verbose=False
        )

        res = results[0]
        num_instances = len(res.boxes) if res.boxes is not None else 0

        instances = []
        if num_instances > 0 and res.masks is not None:
            boxes = res.boxes.xyxy.cpu().numpy()  # [N, 4]
            classes = res.boxes.cls.cpu().numpy().astype(int)
            confidences = res.boxes.conf.cpu().numpy()
            masks = res.masks.data.cpu().numpy()  # [N, H, W]

            for i in range(num_instances):
                cls_id = int(classes[i])
                cls_name = res.names[cls_id] if hasattr(res, 'names') and cls_id in res.names else str(cls_id)
                score = float(confidences[i])
                bbox = boxes[i].tolist()

                # Resize mask to original image dimensions if needed
                mask_raw = masks[i]
                if mask_raw.shape != (orig_h, orig_w):
                    mask_resized = cv2.resize(mask_raw.astype(np.float32), (orig_w, orig_h), interpolation=cv2.INTER_LINEAR)
                    binary_mask = (mask_resized > 0.5).astype(np.uint8)
                else:
                    binary_mask = (mask_raw > 0.5).astype(np.uint8)

                instances.append({
                    "instance_id": i + 1,
                    "class_id": cls_id,
                    "class_name": cls_name,
                    "confidence": score,
                    "bbox": bbox,
                    "mask": binary_mask
                })

        cache_entry = {
            "image_filename": img_path.name,
            "orig_width": orig_w,
            "orig_height": orig_h,
            "num_instances": len(instances),
            "instances": instances
        }

        # Save to pickle file per image stem
        pkl_path = cache_out_dir / f"{img_path.stem}_raw.pkl"
        with open(pkl_path, "wb") as f:
            pickle.dump(cache_entry, f)

        cached_count += 1
        print(f"[✓] Cached raw predictions ({idx}/{len(test_files)}): {img_path.name} ({len(instances)} instances)")

    print(f"\nSuccessfully cached raw predictions for {cached_count} images to: {cache_out_dir}")
    print("==================================================\n")


if __name__ == "__main__":
    cache_raw_test_predictions()
