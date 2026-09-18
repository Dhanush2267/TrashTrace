import os
import sys
import json
import hashlib
import numpy as np
import yaml
from pathlib import Path
from PIL import Image
import cv2

# Add parent directory to sys.path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from src.config import BASE_DIR, RESULTS_DIR


def compute_md5(file_path: Path) -> str:
    """Compute MD5 hash of a file."""
    hasher = hashlib.md5()
    with open(file_path, "rb") as f:
        buf = f.read(65536)
        while len(buf) > 0:
            hasher.update(buf)
            buf = f.read(65536)
    return hasher.hexdigest()


def compute_dhash(image_path: Path, hash_size: int = 8) -> str:
    """Compute difference hash (dhash) for perceptual similarity comparison."""
    try:
        with Image.open(image_path) as img:
            img = img.convert("L").resize((hash_size + 1, hash_size), Image.Resampling.BILINEAR)
            pixels = np.array(img)
            # Compare adjacent pixels
            diff = pixels[:, 1:] > pixels[:, :-1]
            # Convert binary array to hex string
            decimal_val = 0
            for idx, val in enumerate(diff.flatten()):
                if val:
                    decimal_val += 1 << idx
            return f"{decimal_val:016x}"
    except Exception:
        return ""


def hamming_distance(hash1: str, hash2: str) -> int:
    """Calculate Hamming distance between two hex string hashes."""
    if not hash1 or not hash2 or len(hash1) != len(hash2):
        return 64
    try:
        val1 = int(hash1, 16)
        val2 = int(hash2, 16)
        xor_val = val1 ^ val2
        return bin(xor_val).count('1')
    except ValueError:
        return 64


def load_dataset_yaml(yaml_path: Path):
    """Load and parse dataset.yaml file."""
    if not yaml_path.exists():
        raise FileNotFoundError(f"YAML configuration not found at {yaml_path}")
    with open(yaml_path, "r", encoding="utf-8") as f:
        data = yaml.safe_load(f)
    return data


def validate_single_split(images_dir: Path, labels_dir: Path, class_names_map: dict):
    """Inspect and validate images and labels for a single split."""
    report = {
        "image_count": 0,
        "label_count": 0,
        "missing_labels": [],
        "missing_images": [],
        "unopenable_images": [],
        "malformed_labels": [],
        "empty_labels": [],
        "invalid_class_ids": [],
        "nan_inf_values": [],
        "coords_out_of_range": [],
        "insufficient_points": [],
        "extremely_small_polygons": [],
        "total_instances": 0,
        "class_distribution": {int(k): 0 for k in class_names_map.keys()},
        "instances_per_image": [],
        "image_dimensions": {},
        "hashes": {},       # filename -> md5
        "dhashes": {},      # filename -> dhash
    }

    image_extensions = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
    image_files = {}
    if images_dir.exists():
        for f in images_dir.iterdir():
            if f.is_file() and f.suffix.lower() in image_extensions:
                image_files[f.stem] = f

    label_files = {}
    if labels_dir.exists():
        for f in labels_dir.iterdir():
            if f.is_file() and f.suffix.lower() == ".txt":
                label_files[f.stem] = f

    report["image_count"] = len(image_files)
    report["label_count"] = len(label_files)

    # Missing label/image pairs
    for stem, img_path in image_files.items():
        if stem not in label_files:
            report["missing_labels"].append(img_path.name)
    for stem, lbl_path in label_files.items():
        if stem not in image_files:
            report["missing_images"].append(lbl_path.name)

    # Image inspection & hashing
    for stem, img_path in image_files.items():
        try:
            with Image.open(img_path) as img:
                w, h = img.size
                mode = img.mode
                dim_key = f"{w}x{h}"
                report["image_dimensions"][dim_key] = report["image_dimensions"].get(dim_key, 0) + 1
            report["hashes"][img_path.name] = compute_md5(img_path)
            report["dhashes"][img_path.name] = compute_dhash(img_path)
        except Exception as e:
            report["unopenable_images"].append({"file": img_path.name, "error": str(e)})

    # Label parsing & polygon verification
    valid_class_ids = set(int(k) for k in class_names_map.keys())

    for stem, lbl_path in label_files.items():
        if stem not in image_files:
            continue
        try:
            with open(lbl_path, "r", encoding="utf-8") as f:
                lines = [l.strip() for l in f.readlines() if l.strip()]

            if not lines:
                report["empty_labels"].append(lbl_path.name)
                report["instances_per_image"].append(0)
                continue

            instance_count_in_img = 0
            for line_idx, line in enumerate(lines):
                parts = line.split()
                if not parts:
                    continue

                # Class ID check
                try:
                    cls_id = int(float(parts[0]))
                except ValueError:
                    report["malformed_labels"].append({
                        "file": lbl_path.name, "line": line_idx + 1, "reason": "Invalid class ID format"
                    })
                    continue

                if cls_id not in valid_class_ids:
                    report["invalid_class_ids"].append({
                        "file": lbl_path.name, "class_id": cls_id, "line": line_idx + 1
                    })

                # Coordinate parsing
                try:
                    coords = [float(x) for x in parts[1:]]
                except ValueError:
                    report["malformed_labels"].append({
                        "file": lbl_path.name, "line": line_idx + 1, "reason": "Non-numeric coordinates"
                    })
                    continue

                # Check NaN / Inf
                if any(np.isnan(c) or np.isinf(c) for c in coords):
                    report["nan_inf_values"].append({
                        "file": lbl_path.name, "line": line_idx + 1
                    })

                # Check point count (min 3 points = 6 floats, even number)
                if len(coords) < 6 or len(coords) % 2 != 0:
                    report["insufficient_points"].append({
                        "file": lbl_path.name, "line": line_idx + 1, "num_coords": len(coords)
                    })
                    continue

                # Coordinate range check [0, 1]
                if any(c < 0.0 or c > 1.0 for c in coords):
                    report["coords_out_of_range"].append({
                        "file": lbl_path.name, "line": line_idx + 1,
                        "min": min(coords), "max": max(coords)
                    })

                # Polygon area check
                xs = coords[0::2]
                ys = coords[1::2]
                width_bbox = max(xs) - min(xs)
                height_bbox = max(ys) - min(ys)
                area_bbox = width_bbox * height_bbox
                if area_bbox < 1e-5:
                    report["extremely_small_polygons"].append({
                        "file": lbl_path.name, "line": line_idx + 1, "bbox_area": round(area_bbox, 7)
                    })

                instance_count_in_img += 1
                report["total_instances"] += 1
                report["class_distribution"][cls_id] = report["class_distribution"].get(cls_id, 0) + 1

            report["instances_per_image"].append(instance_count_in_img)

        except Exception as e:
            report["malformed_labels"].append({
                "file": lbl_path.name, "reason": f"Read error: {str(e)}"
            })

    return report


def run_full_validation():
    print("==================================================")
    print("TRASHTRACE DATASET VALIDATION & LEAKAGE AUDIT")
    print("==================================================")

    normal_base = BASE_DIR / "dataset" / "normal"
    augmented_base = BASE_DIR / "dataset" / "augmented"

    # 1. Class Mapping Verification
    normal_yaml_path = normal_base / "waste_dataset.yaml"
    aug_yaml_path = augmented_base / "waste_dataset.yaml"

    normal_yaml = load_dataset_yaml(normal_yaml_path)
    aug_yaml = load_dataset_yaml(aug_yaml_path)

    normal_names = normal_yaml.get("names", {})
    aug_names = aug_yaml.get("names", {})

    print("\n--- CLASS MAPPING VERIFICATION ---")
    print(f"Normal Dataset YAML: {normal_names}")
    print(f"Augmented Dataset YAML: {aug_names}")

    compatibility_issues = []
    if normal_names != aug_names:
        compatibility_issues.append(f"Class mapping mismatch: Normal={normal_names} vs Augmented={aug_names}")
    else:
        print("[✓] Class mappings match perfectly across normal and augmented dataset YAML files.")

    # 2. Inspect splits for both datasets
    splits = ["train", "val", "test"]
    datasets_data = {
        "normal": {},
        "augmented": {}
    }

    for d_name, d_base in [("normal", normal_base), ("augmented", augmented_base)]:
        print(f"\n--- VALIDATING {d_name.upper()} DATASET ---")
        for split in splits:
            img_dir = d_base / "images" / split
            lbl_dir = d_base / "labels" / split
            split_rep = validate_single_split(img_dir, lbl_dir, normal_names)
            datasets_data[d_name][split] = split_rep

            print(f"[{d_name.upper()} - {split.upper()}]")
            print(f"  Images: {split_rep['image_count']} | Labels: {split_rep['label_count']}")
            print(f"  Missing Labels: {len(split_rep['missing_labels'])} | Missing Images: {len(split_rep['missing_images'])}")
            print(f"  Total Instances: {split_rep['total_instances']}")
            print(f"  Class Distribution: {split_rep['class_distribution']}")
            if split_rep["unopenable_images"]:
                print(f"  [!] Unopenable Images: {len(split_rep['unopenable_images'])}")
            if split_rep["malformed_labels"]:
                print(f"  [!] Malformed Labels: {len(split_rep['malformed_labels'])}")
            if split_rep["coords_out_of_range"]:
                print(f"  [!] Coords out of range [0, 1]: {len(split_rep['coords_out_of_range'])}")
            if split_rep["insufficient_points"]:
                print(f"  [!] Insufficient polygon points (<6): {len(split_rep['insufficient_points'])}")

    # 3. Leakage Analysis
    print("\n--- MULTI-STAGE LEAKAGE ANALYSIS ---")
    leakage_report = {
        "flagged_samples": [],
        "leakage_detected": False,
        "excluded_from_aug_train": [],
        "summary": {}
    }

    # Reference pools from Normal dataset
    normal_pools = {}
    for split in splits:
        normal_pools[split] = datasets_data["normal"][split]

    aug_train = datasets_data["augmented"]["train"]

    # Check each image in augmented/train against normal/train, normal/val, normal/test
    for aug_file, aug_md5 in aug_train["hashes"].items():
        aug_dhash = aug_train["dhashes"].get(aug_file, "")
        aug_stem = Path(aug_file).stem

        # Check against normal train, val, test
        matched = False
        for ref_split in ["train", "val", "test"]:
            ref_hashes = normal_pools[ref_split]["hashes"]
            ref_dhashes = normal_pools[ref_split]["dhashes"]

            for ref_file, ref_md5 in ref_hashes.items():
                ref_stem = Path(ref_file).stem
                ref_dhash = ref_dhashes.get(ref_file, "")

                evidence = []
                classification = "no evidence"

                # Check 1: Exact MD5 match
                if aug_md5 == ref_md5:
                    evidence.append("exact_md5_hash_match")
                    classification = "exact duplicate"

                # Check 2: Filename pattern match
                if aug_stem == ref_stem or aug_stem.startswith(ref_stem) or ref_stem in aug_stem:
                    evidence.append(f"filename_stem_match ({ref_stem})")
                    if classification == "no evidence":
                        classification = "likely transformed duplicate"

                # Check 3: Perceptual Hash match (Hamming dist <= 4)
                h_dist = hamming_distance(aug_dhash, ref_dhash)
                if h_dist <= 4:
                    evidence.append(f"perceptual_dhash_match (hamming_dist={h_dist})")
                    if classification == "no evidence":
                        classification = "likely transformed duplicate"

                if evidence:
                    entry = {
                        "aug_train_file": aug_file,
                        "matched_normal_split": ref_split,
                        "matched_normal_file": ref_file,
                        "classification": classification,
                        "evidence": evidence
                    }
                    leakage_report["flagged_samples"].append(entry)

                    if ref_split in ["val", "test"]:
                        leakage_report["leakage_detected"] = True
                        leakage_report["excluded_from_aug_train"].append({
                            "file": aug_file,
                            "derived_from_split": ref_split,
                            "derived_from_file": ref_file,
                            "reason": f"Augmented image derived from held-out {ref_split} sample: {evidence}"
                        })
                        print(f"  [LEAKAGE DETECTED!] {aug_file} in augmented/train is derived from normal/{ref_split}/{ref_file} via {evidence}")
                    matched = True
                    break
            if matched:
                break

    if not leakage_report["leakage_detected"]:
        print("[✓] NO LEAKAGE DETECTED: No augmented train images stem from normal validation or test sets.")
    else:
        print(f"[!] TOTAL LEAKAGE DETECTED: {len(leakage_report['excluded_from_aug_train'])} augmented train images were derived from val/test sets and MUST be excluded from training.")

    # 4. Save validation JSON and TXT
    results_metrics_dir = RESULTS_DIR / "metrics"
    results_metrics_dir.mkdir(parents=True, exist_ok=True)

    json_path = results_metrics_dir / "dataset_validation.json"
    txt_path = results_metrics_dir / "dataset_validation.txt"

    full_output = {
        "class_mapping_normal": normal_names,
        "class_mapping_augmented": aug_names,
        "compatibility_issues": compatibility_issues,
        "datasets": datasets_data,
        "leakage_report": leakage_report
    }

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(full_output, f, indent=2)

    # Human-readable report
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write("TRASHTRACE DATASET VALIDATION REPORT\n")
        f.write("===================================\n\n")
        f.write(f"Class Mappings: {normal_names}\n")
        f.write(f"Compatibility Issues: {compatibility_issues if compatibility_issues else 'None'}\n\n")

        for d_name in ["normal", "augmented"]:
            f.write(f"--- {d_name.upper()} DATASET ---\n")
            for split in splits:
                s_rep = datasets_data[d_name][split]
                f.write(f"Split: {split}\n")
                f.write(f"  Images: {s_rep['image_count']}\n")
                f.write(f"  Labels: {s_rep['label_count']}\n")
                f.write(f"  Missing Labels: {len(s_rep['missing_labels'])}\n")
                f.write(f"  Missing Images: {len(s_rep['missing_images'])}\n")
                f.write(f"  Total Instances: {s_rep['total_instances']}\n")
                f.write(f"  Class Distribution: {s_rep['class_distribution']}\n")
                f.write(f"  Dimensions: {s_rep['image_dimensions']}\n")
                f.write(f"  Malformed Labels: {len(s_rep['malformed_labels'])}\n")
                f.write(f"  Coords Out of Range: {len(s_rep['coords_out_of_range'])}\n")
                f.write(f"  Insufficient Points: {len(s_rep['insufficient_points'])}\n\n")

        f.write("--- LEAKAGE ANALYSIS ---\n")
        f.write(f"Leakage Detected: {leakage_report['leakage_detected']}\n")
        f.write(f"Excluded Samples Count: {len(leakage_report['excluded_from_aug_train'])}\n")
        for exc in leakage_report['excluded_from_aug_train']:
            f.write(f"  - {exc['file']} derived from normal/{exc['derived_from_split']}/{exc['derived_from_file']} ({exc['reason']})\n")

    print(f"\nSaved validation JSON report to: {json_path}")
    print(f"Saved validation TXT report to: {txt_path}")
    print("==================================================\n")

    return full_output


if __name__ == "__main__":
    run_full_validation()
