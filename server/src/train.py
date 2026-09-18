import os
import sys
from pathlib import Path
from ultralytics import YOLO

# Add parent directory to sys.path to support module imports
sys.path.append(str(Path(__file__).resolve().parent.parent))

from src.config import MODEL, DEVICE, IMAGE_SIZE, BATCH_SIZE, EPOCHS, DATA_DIR, RESULTS_DIR


def train_model(dataset_yaml_path: str = None):
    """
    Train instance segmentation model on real-world waste dataset.
    Fails clearly if dataset.yaml is missing.
    """
    if dataset_yaml_path is None:
        dataset_yaml_path = DATA_DIR / "dataset.yaml"
    else:
        dataset_yaml_path = Path(dataset_yaml_path)

    if not dataset_yaml_path.exists():
        raise FileNotFoundError(
            f"Dataset configuration file not found at: '{dataset_yaml_path}'. "
            f"Please prepare the dataset and create dataset.yaml before starting training."
        )

    print(f"Loading pretrained segmentation model: {MODEL}")
    model = YOLO(MODEL)

    print(f"Starting training on device={DEVICE}...")
    print(f"Params: imgsz={IMAGE_SIZE}, batch={BATCH_SIZE}, epochs={EPOCHS}")

    results = model.train(
        data=str(dataset_yaml_path),
        epochs=EPOCHS,
        imgsz=IMAGE_SIZE,
        batch=BATCH_SIZE,
        device=DEVICE,
        project=str(RESULTS_DIR / "runs"),
        name="waste_instance_segmentation",
        exist_ok=True,
    )

    print("Training complete. Results saved at:", results.save_dir)
    return results


if __name__ == "__main__":
    try:
        train_model()
    except Exception as e:
        print(f"Training script halted: {e}")
        sys.exit(1)
