import sys
import torch
from pathlib import Path
from ultralytics import YOLO

# Add parent directory to sys.path to support module imports
sys.path.append(str(Path(__file__).resolve().parent.parent))

from src.config import RESULTS_DIR


def test_pretrained_segmentation():
    print("==========================================")
    print("TrashTrace Pretrained Segmentation Test")
    print("==========================================")

    # Check CUDA
    if not torch.cuda.is_available():
        print("ERROR: CUDA is not available!")
        sys.exit(1)

    gpu_name = torch.cuda.get_device_name(0)
    print(f"GPU: {gpu_name}")
    print(f"CUDA: available (PyTorch CUDA {torch.version.cuda})")

    # Try loading yolo26n-seg.pt or fallback to yolo11n-seg.pt / yolov8n-seg.pt if yolo26n-seg.pt is not standard in release
    model_name = "yolo26n-seg.pt"
    try:
        print(f"\nAttempting to load model: {model_name}")
        model = YOLO(model_name)
    except Exception as e:
        print(f"yolo26n-seg.pt load note: {e}")
        model_name = "yolo11n-seg.pt"
        print(f"Loading primary segmentation model: {model_name}")
        model = YOLO(model_name)

    print("Model loaded successfully")

    # Sample image for smoke test
    sample_img = "https://ultralytics.com/images/bus.jpg"
    print(f"Running segmentation inference on sample image: {sample_img}")
    print("Parameters: device=0, imgsz=640, conf=0.25")

    results = model.predict(
        source=sample_img,
        device=0,
        imgsz=640,
        conf=0.25,
        save=True,
        project=str(RESULTS_DIR / "runs"),
        name="pretrained_smoke_test",
        exist_ok=True
    )

    result = results[0]
    num_instances = len(result.boxes) if result.boxes is not None else 0
    print(f"\nNumber of detected instances: {num_instances}")

    if result.masks is None:
        print("ERROR: No segmentation masks returned by the model!")
        sys.exit(1)

    masks = result.masks.data.cpu().numpy()  # Binary masks shape: [N, H, W]
    classes = result.boxes.cls.cpu().numpy().astype(int)
    confidences = result.boxes.conf.cpu().numpy()
    names = result.names

    for i in range(num_instances):
        cls_id = classes[i]
        cls_name = names[cls_id] if cls_id in names else str(cls_id)
        conf = float(confidences[i])
        mask_shape = masks[i].shape

        print(f"\nInstance {i+1}:")
        print(f"    class: {cls_name} (ID {cls_id})")
        print(f"    confidence: {conf:.4f}")
        print(f"    mask shape: {mask_shape}")

    # VRAM check
    allocated_mb = torch.cuda.memory_allocated(0) / 1024**2
    reserved_mb = torch.cuda.memory_reserved(0) / 1024**2
    total_gb = torch.cuda.get_device_properties(0).total_memory / 1024**3
    print("\n------------------------------------------")
    print(f"VRAM Usage - Allocated: {allocated_mb:.2f} MB | Reserved: {reserved_mb:.2f} MB | Total: {total_gb:.2f} GB")
    print(f"Results saved to: {RESULTS_DIR / 'runs' / 'pretrained_smoke_test'}")
    print("==========================================")
    print("SMOKE TEST PASS: Instance segmentation masks verified.")


if __name__ == "__main__":
    test_pretrained_segmentation()
