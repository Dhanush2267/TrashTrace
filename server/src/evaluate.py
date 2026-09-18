import sys
from pathlib import Path
from ultralytics import YOLO

# Add parent directory to sys.path to support module imports
sys.path.append(str(Path(__file__).resolve().parent.parent))

from src.config import MODEL, DEVICE, IMAGE_SIZE, DATA_DIR, RESULTS_DIR


def evaluate_model(model_path: str = MODEL, dataset_yaml_path: str = None):
    """
    Evaluate instance segmentation model on validation set.
    """
    if dataset_yaml_path is None:
        dataset_yaml_path = DATA_DIR / "dataset.yaml"
    else:
        dataset_yaml_path = Path(dataset_yaml_path)

    if not dataset_yaml_path.exists():
        raise FileNotFoundError(
            f"Dataset configuration file not found at: '{dataset_yaml_path}'"
        )

    print(f"Loading model for evaluation: {model_path}")
    model = YOLO(model_path)

    print(f"Running validation on device={DEVICE}...")
    metrics = model.val(
        data=str(dataset_yaml_path),
        imgsz=IMAGE_SIZE,
        device=DEVICE,
        project=str(RESULTS_DIR / "metrics"),
        name="evaluation"
    )

    print("Evaluation completed.")
    return metrics


if __name__ == "__main__":
    try:
        evaluate_model()
    except Exception as e:
        print(f"Evaluation script halted: {e}")
        sys.exit(1)
