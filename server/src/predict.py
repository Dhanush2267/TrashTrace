import sys
import argparse
import cv2
import torch
import numpy as np
from pathlib import Path
from ultralytics import YOLO

# Add parent directory to sys.path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from src.config import (
    MODEL, DEVICE, IMAGE_SIZE, CONFIDENCE_THRESHOLD,
    BASE_DIR, RESULTS_DIR
)
from src.postprocess import postprocess_instances, render_instances_overlay


def run_prediction_pipeline(
    source: str,
    model_path: str = None,
    conf: float = CONFIDENCE_THRESHOLD,
    imgsz: int = IMAGE_SIZE,
    device: str = DEVICE,
    postprocess_mode: str = "full",
    save_output: bool = True
):
    source_path = Path(source)
    if not source_path.exists():
        raise FileNotFoundError(f"Source file or directory not found: {source}")

    if model_path is None:
        model_path = RESULTS_DIR / "training" / "baseline_yolo26n" / "weights" / "best.pt"
        if not model_path.exists():
            model_path = BASE_DIR / MODEL

    print(f"Loading YOLO segmentation model: {model_path}")
    model = YOLO(str(model_path))

    image_extensions = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
    if source_path.is_file():
        image_files = [source_path]
    else:
        image_files = [f for f in source_path.iterdir() if f.is_file() and f.suffix.lower() in image_extensions]

    out_dir = RESULTS_DIR / "predictions" / postprocess_mode
    out_dir.mkdir(parents=True, exist_ok=True)

    results_list = []

    for img_path in image_files:
        img = cv2.imread(str(img_path))
        if img is None:
            print(f"[!] Warning: Could not read image {img_path}")
            continue

        orig_h, orig_w = img.shape[:2]

        results = model.predict(
            source=str(img_path),
            device=device,
            imgsz=imgsz,
            conf=conf,
            verbose=False
        )

        res = results[0]
        num_raw = len(res.boxes) if res.boxes is not None else 0

        raw_instances = []
        if num_raw > 0 and res.masks is not None:
            boxes = res.boxes.xyxy.cpu().numpy()
            classes = res.boxes.cls.cpu().numpy().astype(int)
            confidences = res.boxes.conf.cpu().numpy()
            masks = res.masks.data.cpu().numpy()

            for i in range(num_raw):
                cls_id = int(classes[i])
                cls_name = res.names[cls_id] if hasattr(res, 'names') and cls_id in res.names else str(cls_id)
                score = float(confidences[i])
                bbox = boxes[i].tolist()

                mask_raw = masks[i]
                if mask_raw.shape != (orig_h, orig_w):
                    mask_resized = cv2.resize(mask_raw.astype(np.float32), (orig_w, orig_h), interpolation=cv2.INTER_LINEAR)
                    binary_mask = (mask_resized > 0.5).astype(np.uint8)
                else:
                    binary_mask = (mask_raw > 0.5).astype(np.uint8)

                raw_instances.append({
                    "instance_id": i + 1,
                    "class_id": cls_id,
                    "class_name": cls_name,
                    "confidence": score,
                    "bbox": bbox,
                    "mask": binary_mask
                })

        # Apply post-processing pipeline
        final_instances = postprocess_instances(raw_instances, mode=postprocess_mode)

        if save_output:
            annotated_frame = render_instances_overlay(img, final_instances)
            out_file = out_dir / f"pred_{img_path.name}"
            cv2.imwrite(str(out_file), annotated_frame)

        results_list.append({
            "image": img_path.name,
            "raw_detections": len(raw_instances),
            "final_instances": len(final_instances),
            "instances": [
                {
                    "instance_id": inst["instance_id"],
                    "class_id": inst["class_id"],
                    "class_name": inst["class_name"],
                    "confidence": round(inst["confidence"], 4),
                    "bbox": [round(b, 2) for b in inst["bbox"]]
                }
                for inst in final_instances
            ]
        })

        print(f"[✓] {img_path.name}: {len(raw_instances)} raw detections -> {len(final_instances)} post-processed instances (mode='{postprocess_mode}')")

    return results_list


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run TrashTrace instance segmentation prediction.")
    parser.add_argument("--model", type=str, default=None, help="Path to YOLO segmentation model.")
    parser.add_argument("--source", type=str, required=True, help="Path to image file or directory.")
    parser.add_argument("--conf", type=float, default=CONFIDENCE_THRESHOLD, help="Confidence threshold.")
    parser.add_argument("--imgsz", type=int, default=IMAGE_SIZE, help="Image size.")
    parser.add_argument("--device", type=str, default=str(DEVICE), help="CUDA device index or 'cpu'.")
    parser.add_argument("--postprocess", type=str, choices=["none", "watershed", "morphology", "full"], default="full", help="Post-processing mode.")

    args = parser.parse_args()

    run_prediction_pipeline(
        source=args.source,
        model_path=args.model,
        conf=args.conf,
        imgsz=args.imgsz,
        device=args.device,
        postprocess_mode=args.postprocess
    )
