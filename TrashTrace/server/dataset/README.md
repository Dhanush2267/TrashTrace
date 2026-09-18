# WasteFusion Dataset

Real-world waste instance segmentation dataset built from TACO (Trash Annotations in Context).

## Datasets

### Normal (Clean)
Original, unaugmented images only.

| Split | Images | Labels |
|-------|--------|--------|
| train | 350    | 350    |
| val   | 100    | 100    |
| test  | 50     | 50     |
| **Total** | **500** | **500** |

YAML: `server/dataset/normal/waste_dataset.yaml`

### Augmented
Training split contains original + offline augmented samples.
Validation and test remain original and unaugmented.

| Split | Images | Notes |
|-------|--------|-------|
| train | 800    | 350 original + 450 augmented |
| val   | 100    | Original only (same as normal/val) |
| test  | 50     | Original only (same as normal/test) |
| **Total** | **950** | |

YAML: `server/dataset/augmented/waste_dataset.yaml`

## Classes

| ID | Class |
|----|-------|
| 0  | plastic |
| 1  | metal |
| 2  | paper_cardboard |
| 3  | glass |
| 4  | other |

## Annotation Format

Ultralytics YOLO instance segmentation polygon format.

Each `.txt` label file contains one row per object instance:

```
<class_id> <x1> <y1> <x2> <y2> ... <xn> <yn>
```

- Coordinates normalized to [0.0, 1.0]
- At least 3 polygon points per instance
- Class IDs 0?4 only

## Model Target

`yolo26n-seg.pt` (YOLO26 Nano Instance Segmentation)

## Training

```bash
# From server/ directory:

# Augmented dataset (recommended)
yolo segment train \
  model=yolo26n-seg.pt \
  data=dataset/augmented/waste_dataset.yaml \
  epochs=100 imgsz=640 batch=16

# Clean/normal dataset (baseline)
yolo segment train \
  model=yolo26n-seg.pt \
  data=dataset/normal/waste_dataset.yaml \
  epochs=100 imgsz=640 batch=16
```

## Split Design

- **70% train / 20% val / 10% test**
- Val and test sets are identical in both normal and augmented datasets
- Only training images were augmented
- Train/val/test leakage checked with exact (MD5) and perceptual hashing

## Source

Built from TACO dataset (1,500 images, 60 categories ? 5 WasteFusion classes).
ZeroWaste-s-parts dataset excluded (corrupted download ? all files 0 bytes).

Images are tracked with Git LFS.
