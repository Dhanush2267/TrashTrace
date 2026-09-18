import os
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "dataset" / "combined"
DATASET_YAML_PATH = DATA_DIR / "dataset.yaml"
MODELS_DIR = BASE_DIR / "models"
RESULTS_DIR = BASE_DIR / "results"

# Primary Model Configuration
MODEL = "yolo26n-seg.pt"
DEVICE = 0
IMAGE_SIZE = 640
BATCH_SIZE = 4
EPOCHS = 20
WORKERS = 2

# Thresholds
CONFIDENCE_THRESHOLD = 0.25
IOU_THRESHOLD = 0.50

# Selective Watershed Parameters
WATERSHED_DISTANCE_THRESHOLD = 0.35  # Fraction of max distance transform to form peaks
MIN_PEAK_DISTANCE = 7                # Minimum pixel distance between foreground peak markers
WATERSHED_MIN_PEAKS = 2              # Minimum number of peaks required to trigger watershed splitting
WATERSHED_MIN_REGION_AREA = 100      # Minimum area (pixels) for a split region to be retained

# Morphological Refinement Parameters
MORPH_KERNEL_SIZE = 3                # Morphological kernel size (3x3 structuring element)
MIN_COMPONENT_AREA = 100             # Minimum connected component area (pixels) to filter noise

# Random Seed for Reproducibility
RANDOM_SEED = 42
