# TrashTrace - Real-World Waste Instance Segmentation

## Project

**IS-02 — Real-World Waste Instance Segmentation**

Develop an instance segmentation system that identifies individual waste objects in cluttered real-world scenes. For every visible waste object, the system generates an individual pixel mask and predicts its category, including cases involving overlap and partial occlusion.

## Hardware

* GPU: NVIDIA GeForce RTX 3050 6GB Laptop GPU
* VRAM: 6 GB
* OS: Windows
* Driver: 610.62 (CUDA 12.4 / 13.3 driver support)

## Current Model

* Primary: YOLO26n-Seg

## Environment

* Python 3.11 (Conda env: `waste-seg`)
* PyTorch 2.6.0+cu124 (CUDA 12.4)
* Ultralytics 8.4.155

### Installation & Setup

1. Create & Activate Conda Environment:
   ```bash
   conda create -n waste-seg python=3.11 -y
   conda activate waste-seg
   ```

2. Install PyTorch with CUDA support:
   ```bash
   pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu124
   ```

3. Install project dependencies:
   ```bash
   pip install -r server/requirements.txt
   ```

4. Verify environment:
   ```bash
   C:\Users\Thiya\anaconda3\envs\waste-seg\python.exe server/tests/test_environment.py
   ```

## Current Status

```text
[✓] Environment created
[✓] PyTorch CUDA verified
[✓] GPU verified
[✓] Ultralytics verified
[✓] Pretrained segmentation inference verified
[ ] Dataset integrated
[ ] Training completed
[ ] Evaluation completed
[ ] Post-processing completed
[ ] React client integrated
```

## Repository Architecture

```text
TrashTrace/
├── client/              # React frontend (developed by team)
│   └── .gitkeep
├── server/
│   ├── data/
│   │   ├── raw/
│   │   ├── processed/
│   │   └── dataset.yaml
│   ├── models/
│   │   └── pretrained/
│   ├── src/
│   │   ├── __init__.py
│   │   ├── config.py
│   │   ├── train.py
│   │   ├── predict.py
│   │   ├── evaluate.py
│   │   └── postprocess.py
│   ├── tests/
│   │   ├── test_environment.py
│   │   └── test_segmentation.py
│   ├── results/
│   │   ├── predictions/
│   │   └── metrics/
│   ├── notebooks/
│   └── requirements.txt
├── README.md
└── .gitignore
```
