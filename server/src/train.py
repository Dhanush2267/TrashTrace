import os
import sys
import argparse
import torch
from pathlib import Path
from ultralytics import YOLO

# Add parent directory to sys.path to support module imports
sys.path.append(str(Path(__file__).resolve().parent.parent))

from src.config import (
    MODEL, DEVICE, IMAGE_SIZE, BATCH_SIZE, EPOCHS, WORKERS,
    BASE_DIR, RESULTS_DIR
)


def run_training(
    smoke_test: bool = False,
    dataset_yaml: str = None,
    epochs: int = None,
    batch_size: int = None,
    imgsz: int = None,
    device: str = None,
    workers: int = None
):
    print("==================================================")
    print("TRASHTRACE YOLO26N-SEG TRAINING PIPELINE")
    print("==================================================")

    if dataset_yaml is None:
        dataset_yaml = BASE_DIR / "dataset" / "combined" / "dataset.yaml"
        if not dataset_yaml.exists():
            dataset_yaml = BASE_DIR / "dataset" / "normal" / "waste_dataset.yaml"
    else:
        dataset_yaml = Path(dataset_yaml)

    if not dataset_yaml.exists():
        raise FileNotFoundError(f"Dataset configuration file not found at: {dataset_yaml}")

    # Set parameters based on mode
    if smoke_test:
        exp_name = "smoke_test"
        num_epochs = 3
        print("\n*** RUNNING 3-EPOCH SMOKE TEST SANITY CHECK ***")
    else:
        exp_name = "baseline_yolo26n"
        num_epochs = epochs if epochs is not None else EPOCHS
        print(f"\n*** RUNNING FULL {num_epochs}-EPOCH BASELINE TRAINING ***")

    batch = batch_size if batch_size is not None else BATCH_SIZE
    img_size = imgsz if imgsz is not None else IMAGE_SIZE
    dev = device if device is not None else DEVICE
    num_workers = workers if workers is not None else WORKERS

    # Check CUDA availability
    if not torch.cuda.is_available() and str(dev) != "cpu":
        print("[!] Warning: CUDA is not available. Falling back to CPU.")
        dev = "cpu"
    elif torch.cuda.is_available():
        gpu_name = torch.cuda.get_device_name(0)
        vram_gb = round(torch.cuda.get_device_properties(0).total_memory / 1024**3, 2)
        print(f"Target GPU: {gpu_name} ({vram_gb} GB VRAM)")

    model_path = BASE_DIR / MODEL
    if not model_path.exists():
        model_path = MODEL

    print(f"Pretrained Model: {model_path}")
    print(f"Dataset YAML: {dataset_yaml}")
    print(f"Parameters: imgsz={img_size}, batch={batch}, epochs={num_epochs}, device={dev}, workers={num_workers}")

    project_dir = RESULTS_DIR / "training"
    project_dir.mkdir(parents=True, exist_ok=True)

    # Attempt training with automatic OOM fallback
    try:
        model = YOLO(str(model_path))
        results = model.train(
            data=str(dataset_yaml),
            epochs=num_epochs,
            imgsz=img_size,
            batch=batch,
            device=dev,
            workers=num_workers,
            project=str(project_dir),
            name=exp_name,
            exist_ok=True,
            plots=True,
            save=True,
            val=True
        )
        print(f"\n[✓] Training completed successfully!")
        print(f"Results saved to: {project_dir / exp_name}")
        return results

    except torch.cuda.OutOfMemoryError as oom_err:
        print(f"\n[!] CUDA OutOfMemoryError encountered with batch={batch}, imgsz={img_size}.")
        if batch > 2:
            fallback_batch = 2
            print(f"--> Attempting Fallback 1: Reducing batch size to {fallback_batch}...")
            torch.cuda.empty_cache()
            model = YOLO(str(model_path))
            return model.train(
                data=str(dataset_yaml),
                epochs=num_epochs,
                imgsz=img_size,
                batch=fallback_batch,
                device=dev,
                workers=num_workers,
                project=str(project_dir),
                name=exp_name,
                exist_ok=True,
                plots=True,
                save=True,
                val=True
            )
        elif img_size > 512:
            fallback_imgsz = 512
            print(f"--> Attempting Fallback 2: Reducing image size to {fallback_imgsz}...")
            torch.cuda.empty_cache()
            model = YOLO(str(model_path))
            return model.train(
                data=str(dataset_yaml),
                epochs=num_epochs,
                imgsz=fallback_imgsz,
                batch=batch,
                device=dev,
                workers=num_workers,
                project=str(project_dir),
                name=exp_name,
                exist_ok=True,
                plots=True,
                save=True,
                val=True
            )
        else:
            raise oom_err


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train YOLO26n-Seg baseline model on TrashTrace dataset.")
    parser.add_argument("--smoke-test", action="store_true", help="Run a 3-epoch smoke test.")
    parser.add_argument("--dataset", type=str, default=None, help="Path to dataset.yaml.")
    parser.add_argument("--epochs", type=int, default=None, help="Number of training epochs.")
    parser.add_argument("--batch", type=int, default=None, help="Batch size.")
    parser.add_argument("--imgsz", type=int, default=None, help="Image size.")
    parser.add_argument("--device", type=str, default=None, help="CUDA device index or 'cpu'.")
    parser.add_argument("--workers", type=int, default=None, help="DataLoader worker threads.")

    args = parser.parse_args()

    run_training(
        smoke_test=args.smoke_test,
        dataset_yaml=args.dataset,
        epochs=args.epochs,
        batch_size=args.batch,
        imgsz=args.imgsz,
        device=args.device,
        workers=args.workers
    )
