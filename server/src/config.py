import os
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"
MODELS_DIR = BASE_DIR / "models"
PRETRAINED_MODELS_DIR = MODELS_DIR / "pretrained"
RESULTS_DIR = BASE_DIR / "results"

# Initial Configuration Defaults
MODEL = "yolo26n-seg.pt"  # Primary model candidate (or fallback to yolo11n-seg.pt if needed)
DEVICE = 0
IMAGE_SIZE = 640
BATCH_SIZE = 4
EPOCHS = 20
CONFIDENCE_THRESHOLD = 0.25
IOU_THRESHOLD = 0.50
