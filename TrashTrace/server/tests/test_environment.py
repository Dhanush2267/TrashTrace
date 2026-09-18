import sys


def test_environment():
    print("==========================================")
    print("TrashTrace Environment Verification Test")
    print("==========================================")

    errors = []

    # 1. Imports
    try:
        import torch
        print(f"[OK] PyTorch version: {torch.__version__}")
    except Exception as e:
        errors.append(f"[X] PyTorch import failed: {e}")

    try:
        import ultralytics
        print(f"[OK] Ultralytics version: {ultralytics.__version__}")
    except Exception as e:
        errors.append(f"[X] Ultralytics import failed: {e}")

    try:
        import cv2
        print(f"[OK] OpenCV version: {cv2.__version__}")
    except Exception as e:
        errors.append(f"[X] OpenCV import failed: {e}")

    try:
        import numpy as np
        print(f"[OK] NumPy version: {np.__version__}")
    except Exception as e:
        errors.append(f"[X] NumPy import failed: {e}")

    try:
        import PIL
        print(f"[OK] PIL version: {PIL.__version__}")
    except Exception as e:
        errors.append(f"[X] PIL import failed: {e}")

    try:
        import pandas as pd
        print(f"[OK] Pandas version: {pd.__version__}")
    except Exception as e:
        errors.append(f"[X] Pandas import failed: {e}")

    try:
        import streamlit as st
        print(f"[OK] Streamlit version: {st.__version__}")
    except Exception as e:
        errors.append(f"[X] Streamlit import failed: {e}")

    # 2. CUDA Check
    try:
        import torch
        cuda_ok = torch.cuda.is_available()
        print(f"[OK] PyTorch CUDA available: {cuda_ok}")
        if cuda_ok:
            device_name = torch.cuda.get_device_name(0)
            vram_gb = round(torch.cuda.get_device_properties(0).total_memory / 1024**3, 2)
            print(f"[OK] GPU Device: {device_name}")
            print(f"[OK] VRAM: {vram_gb} GB")
            print(f"[OK] CUDA Version: {torch.version.cuda}")
        else:
            errors.append("[X] CUDA is not available in PyTorch!")
    except Exception as e:
        errors.append(f"[X] CUDA check failed: {e}")

    print("==========================================")
    if errors:
        print("RESULT: FAIL")
        for err in errors:
            print(err)
        sys.exit(1)
    else:
        print("RESULT: PASS - All dependencies and CUDA environment verified successfully.")
        sys.exit(0)


if __name__ == "__main__":
    test_environment()
