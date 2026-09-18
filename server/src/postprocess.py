import cv2
import numpy as np
from pathlib import Path
import sys

# Add parent directory to sys.path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from src.config import (
    WATERSHED_DISTANCE_THRESHOLD, MIN_PEAK_DISTANCE,
    WATERSHED_MIN_PEAKS, WATERSHED_MIN_REGION_AREA,
    MORPH_KERNEL_SIZE, MIN_COMPONENT_AREA
)


def compute_mask_area(mask: np.ndarray) -> int:
    """Compute pixel count of binary segmentation mask."""
    return int(np.sum(mask > 0))


def apply_morphological_refinement(
    mask: np.ndarray,
    kernel_size: int = MORPH_KERNEL_SIZE,
    min_area: int = MIN_COMPONENT_AREA
) -> np.ndarray:
    """
    Apply conservative morphological refinement + connected-component area filtering.
    Operations:
    1. Morphological opening (removes small isolated noise/spurs)
    2. Morphological closing (fills small mask holes)
    3. Hole filling via contour retrieval
    4. Connected components filtering (discards tiny components < min_area)
    """
    if mask is None or np.sum(mask > 0) == 0:
        return mask if mask is not None else np.zeros((1, 1), dtype=np.uint8)

    binary = (mask > 0).astype(np.uint8)
    h, w = binary.shape

    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (kernel_size, kernel_size))

    # 1. Opening
    opened = cv2.morphologyEx(binary, cv2.MORPH_OPEN, kernel)

    # 2. Closing
    closed = cv2.morphologyEx(opened, cv2.MORPH_CLOSE, kernel)

    # 3. Fill interior holes
    contours, _ = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    filled = np.zeros_like(closed)
    if contours:
        cv2.drawContours(filled, contours, -1, 1, -1)
    else:
        filled = closed

    # 4. Connected components area filtering
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(filled, connectivity=8)
    clean_mask = np.zeros_like(filled)

    for i in range(1, num_labels):
        comp_area = stats[i, cv2.CC_STAT_AREA]
        if comp_area >= min_area:
            clean_mask[labels == i] = 1

    # Safeguard: If morphological operations destroyed the entire mask, preserve original binary mask
    if np.sum(clean_mask > 0) == 0 and np.sum(binary > 0) > 0:
        return binary

    return clean_mask


def apply_selective_watershed(
    mask: np.ndarray,
    class_id: int,
    class_name: str,
    confidence: float,
    parent_instance_id: int = 1,
    dist_thresh_frac: float = WATERSHED_DISTANCE_THRESHOLD,
    min_peaks: int = WATERSHED_MIN_PEAKS,
    min_region_area: int = WATERSHED_MIN_REGION_AREA
) -> list:
    """
    Apply Distance Transform + Selective Watershed to separate touching/merged objects.
    Selective condition: Triggered ONLY if multiple meaningful distance peaks exist.
    """
    if mask is None or np.sum(mask > 0) < min_region_area:
        # Fallback to single instance
        return [{
            "instance_id": parent_instance_id,
            "class_id": class_id,
            "class_name": class_name,
            "confidence": confidence,
            "mask": mask if mask is not None else np.zeros((1, 1), dtype=np.uint8)
        }]

    binary = (mask > 0).astype(np.uint8)
    h, w = binary.shape

    # 1. Euclidean Distance Transform
    dist = cv2.distanceTransform(binary, cv2.DIST_L2, 5)
    max_dist = dist.max()

    if max_dist <= 0:
        return [{
            "instance_id": parent_instance_id,
            "class_id": class_id,
            "class_name": class_name,
            "confidence": confidence,
            "mask": binary
        }]

    # 2. Foreground Peak Thresholding
    peak_mask = (dist > (max_dist * dist_thresh_frac)).astype(np.uint8)

    # 3. Count connected peak components (seeds)
    num_peaks, peak_labels = cv2.connectedComponents(peak_mask)
    num_peaks -= 1  # Exclude background

    # If insufficient evidence of multiple objects, preserve original mask
    if num_peaks < min_peaks:
        return [{
            "instance_id": parent_instance_id,
            "class_id": class_id,
            "class_name": class_name,
            "confidence": confidence,
            "mask": binary
        }]

    # 4. Marker-based Watershed
    # Unknown region: area between dilated peaks and sure background
    sure_fg = peak_mask
    sure_bg = cv2.dilate(binary, np.ones((3, 3), np.uint8), iterations=2)
    sure_bg_inv = 1 - sure_bg
    unknown = cv2.subtract(sure_bg, sure_fg)

    # Label markers
    _, markers = cv2.connectedComponents(sure_fg)
    markers = markers + 1
    markers[unknown == 1] = 0

    # 3-channel dummy image for OpenCV watershed
    dist_8u = cv2.normalize(dist, None, 0, 255, cv2.NORM_MINMAX, dtype=cv2.CV_8U)
    img_3ch = cv2.merge([dist_8u, dist_8u, dist_8u])

    cv2.watershed(img_3ch, markers)

    # 5. Extract separated candidate regions
    separated_instances = []
    unique_labels = np.unique(markers)

    sub_id = 1
    for label_val in unique_labels:
        if label_val <= 1:  # 0 is boundary (-1), 1 is background
            continue

        region_mask = (markers == label_val).astype(np.uint8)
        # Intersect with original binary mask to prevent leakage
        region_mask = np.logical_and(region_mask > 0, binary > 0).astype(np.uint8)

        region_area = int(np.sum(region_mask > 0))
        if region_area >= min_region_area:
            # Recompute bounding box
            ys, xs = np.where(region_mask > 0)
            bbox = [float(xs.min()), float(ys.min()), float(xs.max()), float(ys.max())]

            separated_instances.append({
                "instance_id": parent_instance_id + (sub_id - 1) * 100,
                "class_id": class_id,
                "class_name": class_name,
                "confidence": confidence,
                "bbox": bbox,
                "mask": region_mask
            })
            sub_id += 1

    # Safeguard: If watershed failed or produced 0 valid regions, preserve original mask
    if not separated_instances:
        return [{
            "instance_id": parent_instance_id,
            "class_id": class_id,
            "class_name": class_name,
            "confidence": confidence,
            "mask": binary
        }]

    return separated_instances


def postprocess_instances(instances: list, mode: str = "full") -> list:
    """
    Unified post-processing pipeline.
    Allowed modes:
      - 'none': returns original instances
      - 'watershed': applies selective watershed
      - 'morphology': applies morphological refinement
      - 'full': applies watershed followed by morphological refinement
    """
    if mode == "none" or not instances:
        return instances

    output_instances = []
    inst_counter = 1

    for inst in instances:
        parent_mask = inst["mask"]
        cls_id = inst["class_id"]
        cls_name = inst.get("class_name", str(cls_id))
        conf = inst.get("confidence", 1.0)

        # Step 1: Selective Watershed
        if mode in ["watershed", "full"]:
            ws_res = apply_selective_watershed(
                mask=parent_mask,
                class_id=cls_id,
                class_name=cls_name,
                confidence=conf,
                parent_instance_id=inst_counter
            )
        else:
            ws_res = [{
                "instance_id": inst_counter,
                "class_id": cls_id,
                "class_name": cls_name,
                "confidence": conf,
                "mask": parent_mask
            }]

        # Step 2: Morphological Refinement
        for sub_inst in ws_res:
            raw_sub_mask = sub_inst["mask"]
            if mode in ["morphology", "full"]:
                refined_mask = apply_morphological_refinement(raw_sub_mask)
            else:
                refined_mask = raw_sub_mask

            if np.sum(refined_mask > 0) > 0:
                ys, xs = np.where(refined_mask > 0)
                bbox = [float(xs.min()), float(ys.min()), float(xs.max()), float(ys.max())]

                output_instances.append({
                    "instance_id": inst_counter,
                    "class_id": cls_id,
                    "class_name": cls_name,
                    "confidence": conf,
                    "bbox": bbox,
                    "mask": refined_mask
                })
                inst_counter += 1

    return output_instances


CLASS_COLORS = [
    (0, 255, 127),   # plastic - spring green
    (255, 191, 0),   # metal - amber
    (255, 105, 180), # paper - pink
    (0, 215, 255),   # glass - cyan
    (147, 112, 219)  # other - purple
]


def apply_mask_overlay(image: np.ndarray, mask: np.ndarray, color=(0, 255, 0), alpha=0.5):
    """Apply transparent mask overlay onto an image."""
    colored_mask = np.zeros_like(image, dtype=np.uint8)
    colored_mask[mask > 0] = color
    overlay = cv2.addWeighted(image, 1 - alpha, colored_mask, alpha, 0)
    return overlay


def render_instances_overlay(img: np.ndarray, instances: list) -> np.ndarray:
    """Render instance masks and bounding boxes on an image."""
    canvas = img.copy()
    overlay = img.copy()

    for inst in instances:
        mask = inst["mask"]
        cls_id = inst["class_id"]
        cls_name = inst.get("class_name", str(cls_id))
        conf = inst.get("confidence", 1.0)
        bbox = inst.get("bbox", None)

        color = CLASS_COLORS[cls_id % len(CLASS_COLORS)]

        # Fill mask
        overlay[mask > 0] = color

        # Polygon contour
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        cv2.drawContours(canvas, contours, -1, color, 2)

        # Bounding box & text
        if bbox is not None:
            bx1, by1, bx2, by2 = [int(v) for v in bbox]
            cv2.rectangle(canvas, (bx1, by1), (bx2, by2), color, 1)
            txt = f"{cls_name} {conf:.2f}"
            cv2.putText(canvas, txt, (bx1, max(15, by1 - 5)), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 2)
            cv2.putText(canvas, txt, (bx1, max(15, by1 - 5)), cv2.FONT_HERSHEY_SIMPLEX, 0.4, color, 1)

    alpha = 0.4
    blended = cv2.addWeighted(overlay, alpha, canvas, 1 - alpha, 0)
    return blended

