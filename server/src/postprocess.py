import cv2
import numpy as np


def filter_predictions_by_confidence(instances, min_conf=0.25):
    """
    Filter instance predictions based on confidence threshold.
    """
    return [inst for inst in instances if inst.get("confidence", 0) >= min_conf]


def compute_mask_area(mask: np.ndarray) -> int:
    """
    Compute pixel count/area of binary segmentation mask.
    """
    return int(np.sum(mask > 0))


def apply_mask_overlay(image: np.ndarray, mask: np.ndarray, color=(0, 255, 0), alpha=0.5):
    """
    Apply transparent mask overlay onto an image.
    """
    colored_mask = np.zeros_like(image, dtype=np.uint8)
    colored_mask[mask > 0] = color
    overlay = cv2.addWeighted(image, 1 - alpha, colored_mask, alpha, 0)
    return overlay
