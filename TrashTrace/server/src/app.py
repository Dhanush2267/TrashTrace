import io
import time
import base64
import cv2
import numpy as np
from pathlib import Path
from fastapi import FastAPI, File, UploadFile, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import sys

# Add parent directory to sys.path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from src.config import (
    MODEL, DEVICE, IMAGE_SIZE, CONFIDENCE_THRESHOLD,
    BASE_DIR, RESULTS_DIR
)
from src.predict import run_prediction_pipeline, load_segmentation_model
from src.postprocess import postprocess_instances, render_instances_overlay
from ultralytics import YOLO

app = FastAPI(
    title="TrashTrace Instance Segmentation API",
    description="Real-World Waste Instance Segmentation backend serving YOLO26n-Seg + Selective Post-Processing.",
    version="1.0.0"
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Lazy model loading
MODEL_INSTANCE = None


def get_model():
    global MODEL_INSTANCE
    if MODEL_INSTANCE is None:
        model_path = RESULTS_DIR / "training" / "baseline_yolo26n" / "weights" / "best.pt"
        if not model_path.exists():
            model_path = BASE_DIR / MODEL
        print(f"Loading FastAPI segmentation model from: {model_path}")
        MODEL_INSTANCE = YOLO(str(model_path))
    return MODEL_INSTANCE


@app.get("/health")
def health_check():
    return {
        "status": "online",
        "service": "TrashTrace Backend API",
        "model": "YOLO26n-Seg",
        "device": str(DEVICE)
    }


@app.post("/api/predict")
async def predict_waste_image(
    file: UploadFile = File(...),
    conf: float = Query(CONFIDENCE_THRESHOLD, ge=0.0, le=1.0),
    postprocess: str = Query("full", regex="^(none|watershed|morphology|full)$")
):
    t_start = time.time()

    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File uploaded must be an image (JPEG/PNG/WebP).")

    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if img is None:
        raise HTTPException(status_code=400, detail="Could not decode image file.")

    orig_h, orig_w = img.shape[:2]

    # Run YOLO inference
    t_infer_start = time.time()
    model = get_model()
    results = model.predict(
        source=img,
        device=DEVICE,
        imgsz=IMAGE_SIZE,
        conf=conf,
        verbose=False
    )
    t_infer_end = time.time()

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

    # Apply Post-Processing
    t_post_start = time.time()
    final_instances = postprocess_instances(raw_instances, mode=postprocess)
    t_post_end = time.time()

    # Build Class Counts Summary
    class_names_list = ["plastic", "metal", "paper_cardboard", "glass", "other"]
    class_counts = {c: 0 for c in class_names_list}

    formatted_instances = []
    for inst in final_instances:
        cls_name = inst["class_name"]
        if cls_name in class_counts:
            class_counts[cls_name] += 1
        else:
            class_counts[cls_name] = 1

        mask = inst["mask"]
        ys, xs = np.where(mask > 0)

        # Polygon coordinates
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        poly_coords_norm = []
        if contours:
            largest_cnt = max(contours, key=cv2.contourArea)
            pts = largest_cnt.reshape(-1, 2)
            poly_coords_norm = [[round(pt[0] / orig_w, 4), round(pt[1] / orig_h, 4)] for pt in pts]

        # Edge touching flag
        touching_edge = bool(
            np.any(mask[0, :]) or np.any(mask[-1, :]) or
            np.any(mask[:, 0]) or np.any(mask[:, -1])
        )

        bx1, by1, bx2, by2 = inst["bbox"]
        bbox_norm = [
            round(bx1 / orig_w, 4), round(by1 / orig_h, 4),
            round(bx2 / orig_w, 4), round(by2 / orig_h, 4)
        ]

        formatted_instances.append({
            "instance_id": inst["instance_id"],
            "class_id": inst["class_id"],
            "class_name": inst["class_name"],
            "confidence": round(inst["confidence"], 4),
            "bbox": [round(b, 2) for b in inst["bbox"]],
            "bbox_normalized": bbox_norm,
            "mask_polygon_normalized": poly_coords_norm,
            "mask_area_px": int(np.sum(mask > 0)),
            "is_touching_boundary": touching_edge
        })

    # Render Annotated Base64 Image
    annotated_img = render_instances_overlay(img, final_instances)
    _, buffer = cv2.imencode(".jpg", annotated_img)
    img_b64 = base64.b64encode(buffer).decode("utf-8")

    t_total_end = time.time()

    return {
        "status": "success",
        "message": "Instance segmentation complete",
        "processing_metadata": {
            "postprocess_mode": postprocess,
            "inference_time_ms": round((t_infer_end - t_infer_start) * 1000, 2),
            "postprocess_time_ms": round((t_post_end - t_post_start) * 1000, 2),
            "total_time_ms": round((t_total_end - t_start) * 1000, 2),
            "image_dimensions": {
                "width": orig_w,
                "height": orig_h
            }
        },
        "summary": {
            "total_instances_detected": len(formatted_instances),
            "class_counts": class_counts
        },
        "instances": formatted_instances,
        "visualizations": {
            "annotated_image_base64": f"data:image/jpeg;base64,{img_b64}"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("server.src.app:app", host="0.0.0.0", port=8000, reload=True)
