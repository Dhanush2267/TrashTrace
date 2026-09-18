import os
import sys
import shutil
import csv
import yaml
from pathlib import Path

# Add parent directory to sys.path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from src.config import BASE_DIR


def consolidate_dataset():
    print("==================================================")
    print("TRASHTRACE DATASET CONSOLIDATION")
    print("==================================================")

    normal_base = BASE_DIR / "dataset" / "normal"
    augmented_base = BASE_DIR / "dataset" / "augmented"
    combined_base = BASE_DIR / "dataset" / "combined"

    # Remove existing combined directory if any to start fresh
    if combined_base.exists():
        print(f"Cleaning existing directory: {combined_base}")
        shutil.rmtree(combined_base)

    # Create directory structure
    for split in ["train", "val", "test"]:
        (combined_base / "images" / split).mkdir(parents=True, exist_ok=True)
        (combined_base / "labels" / split).mkdir(parents=True, exist_ok=True)

    manifest_rows = []
    image_extensions = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}

    # Define copy plan:
    # (source_base, source_split, dest_split, prefix)
    copy_plan = [
        (normal_base, "train", "train", "normal_train_"),
        (augmented_base, "train", "train", "aug_train_"),
        (normal_base, "val", "val", "normal_val_"),
        (normal_base, "test", "test", "normal_test_")
    ]

    copied_counts = {"train": 0, "val": 0, "test": 0}

    for src_base, src_split, dest_split, prefix in copy_plan:
        src_img_dir = src_base / "images" / src_split
        src_lbl_dir = src_base / "labels" / src_split
        dataset_name = src_base.name

        if not src_img_dir.exists():
            print(f"[!] Warning: {src_img_dir} does not exist.")
            continue

        img_files = [f for f in src_img_dir.iterdir() if f.is_file() and f.suffix.lower() in image_extensions]

        for img_path in img_files:
            stem = img_path.stem
            ext = img_path.suffix
            lbl_path = src_lbl_dir / f"{stem}.txt"

            dest_img_name = f"{prefix}{img_path.name}"
            dest_lbl_name = f"{prefix}{stem}.txt"

            dest_img_path = combined_base / "images" / dest_split / dest_img_name
            dest_lbl_path = combined_base / "labels" / dest_split / dest_lbl_name

            # Copy image
            shutil.copy2(img_path, dest_img_path)

            # Copy label if exists, else create empty label file
            if lbl_path.exists():
                shutil.copy2(lbl_path, dest_lbl_path)
            else:
                dest_lbl_path.touch()

            manifest_rows.append({
                "source_dataset": dataset_name,
                "source_split": src_split,
                "original_filename": img_path.name,
                "destination_filename": dest_img_name,
                "destination_split": dest_split,
                "destination_label_path": str(dest_lbl_path.relative_to(combined_base))
            })

            copied_counts[dest_split] += 1

    # Save manifest.csv
    manifest_path = combined_base / "manifest.csv"
    fieldnames = [
        "source_dataset", "source_split", "original_filename",
        "destination_filename", "destination_split", "destination_label_path"
    ]
    with open(manifest_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(manifest_rows)

    print(f"[✓] Manifest written to: {manifest_path}")

    # Load class mapping from normal/waste_dataset.yaml
    with open(normal_base / "waste_dataset.yaml", "r", encoding="utf-8") as f:
        normal_yaml_data = yaml.safe_load(f)

    # Create dataset.yaml for combined dataset
    combined_yaml_data = {
        "path": "server/dataset/combined",
        "train": "images/train",
        "val": "images/val",
        "test": "images/test",
        "names": normal_yaml_data.get("names", {})
    }

    yaml_path = combined_base / "dataset.yaml"
    with open(yaml_path, "w", encoding="utf-8") as f:
        yaml.dump(combined_yaml_data, f, sort_keys=False)

    print(f"[✓] dataset.yaml written to: {yaml_path}")
    print("\n--- CONSOLIDATION SUMMARY ---")
    print(f"Combined Train Images: {copied_counts['train']} (350 normal + 800 augmented)")
    print(f"Combined Val Images:   {copied_counts['val']} (100 normal)")
    print(f"Combined Test Images:  {copied_counts['test']} (50 normal)")
    print(f"Total Consolidated:    {sum(copied_counts.values())} images")
    print("==================================================\n")


if __name__ == "__main__":
    consolidate_dataset()
