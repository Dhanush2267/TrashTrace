import sys
import cv2
import torch
import numpy as np
from pathlib import Path
from ultralytics import YOLO

# Add parent directory to sys.path to support module imports
sys.path.append(str(Path(__file__).resolve().parent.parent))

from src.config import MODEL, DEVICE, IMAGE_SIZE, CONFIDENCE_THRESHOLD, RESULTS_DIR


def load_segmentation_model(model_path: str = MODEL):
    """
    Load YOLO segmentation model.
    """
    print(f"Loading YOLO segmentation model: {model_path}")
    model = YOLO(model_path)
    return model


def run_prediction(image_path: str, model=None, conf: float = CONFIDENCE_THRESHOLD, save_output: bool = True):
    """
    Perform instance segmentation inference on an image.
    Extracts bounding boxes, classes, confidence scores, and pixel-level instance masks.
    """
    path = Path(image_path)
    if not path.exists():
        raise FileNotFoundError(f"Image file not found at: {image_path}")

    if model is None:
        model = load_segmentation_model()

    print(f"Running prediction on image: {image_path} (device={DEVICE}, conf={conf}, imgsz={IMAGE_SIZE})")
    results = model.predict(
        source=str(path),
        device=DEVICE,
        imgsz=IMAGE_SIZE,
        conf=conf,
        verbose=False
    )

    result = results[0]
    num_instances = len(result.boxes) if result.boxes is not None else 0
    print(f"Number of detected instances: {num_instances}")

    instance_details = []
    if num_instances > 0 and result.masks is not None:
        boxes = result.boxes.xyxy.cpu().numpy()
        classes = result.boxes.cls.cpu().numpy().astype(int)
        confidences = result.boxes.conf.cpu().numpy()
        masks = result.masks.data.cpu().numpy()  # Binary masks [N, H, W]

        for i in range(num_instances):
            cls_id = classes[i]
            cls_name = result.names[cls_id] if hasattr(result, 'names') and cls_id in result.names else str(cls_id)
            score = float(confidences[i])
            bbox = boxes[i].tolist()
            mask_shape = masks[i].shape

            instance_info = {
                "instance_id": i + 1,
                "class_id": int(cls_id),
                "class_name": cls_name,
                "confidence": score,
                "bbox": bbox,
                "mask_shape": mask_shape
            }
            instance_details.append(instance_info)
            print(f"\nInstance {i+1}:")
            print(f"    class: {cls_name} (ID {cls_id})")
            print(f"    confidence: {score:.4f}")
            print(f"    bbox: {[round(x, 2) for x in bbox]}")
            print(f"    mask shape: {mask_shape}")

    if save_output:
        out_dir = RESULTS_DIR / "predictions"
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = out_dir / f"pred_{path.name}"
        annotated_frame = result.plot()
        cv2.imwrite(str(out_path), annotated_frame)
        print(f"\nPrediction saved to: {out_path}")

    return {
        "result": result,
        "num_instances": num_instances,
        "instances": instance_details
    }


if __name__ == "__main__":
    if len(sys.argv) > 1:
        img_input = sys.argv[1]
        run_prediction(img_input)
    else:
        print("Usage: python src/predict.py <path_to_image>")
