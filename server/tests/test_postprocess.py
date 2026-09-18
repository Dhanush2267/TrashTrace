import sys
import numpy as np
import cv2
from pathlib import Path

# Add parent directory to sys.path
sys.path.append(str(Path(__file__).resolve().parent.parent))

from src.postprocess import (
    apply_morphological_refinement,
    apply_selective_watershed,
    postprocess_instances,
    compute_mask_area
)


def test_empty_mask_handling():
    """Verify post-processing does not crash on empty masks."""
    empty_mask = np.zeros((100, 100), dtype=np.uint8)
    refined = apply_morphological_refinement(empty_mask)
    assert np.sum(refined) == 0, "Empty mask should remain empty after morphology."

    ws_res = apply_selective_watershed(empty_mask, class_id=0, class_name="plastic", confidence=0.9)
    assert len(ws_res) == 1, "Selective watershed on empty mask should return single instance."
    assert np.sum(ws_res[0]["mask"]) == 0
    print("[OK] test_empty_mask_handling passed")


def test_tiny_single_pixel_mask():
    """Verify tiny or single-pixel masks are handled safely."""
    tiny_mask = np.zeros((100, 100), dtype=np.uint8)
    tiny_mask[50, 50] = 1

    refined = apply_morphological_refinement(tiny_mask, min_area=100)
    assert isinstance(refined, np.ndarray)

    ws_res = apply_selective_watershed(tiny_mask, class_id=1, class_name="metal", confidence=0.85)
    assert len(ws_res) == 1
    assert ws_res[0]["class_id"] == 1
    print("[OK] test_tiny_single_pixel_mask passed")


def test_multi_peak_merged_mask_watershed():
    """Verify selective watershed splits two touching merged circular objects."""
    mask = np.zeros((200, 200), dtype=np.uint8)
    cv2.circle(mask, (70, 100), 35, 1, -1)
    cv2.circle(mask, (130, 100), 35, 1, -1)

    assert compute_mask_area(mask) > 0

    ws_res = apply_selective_watershed(
        mask,
        class_id=0,
        class_name="plastic",
        confidence=0.95,
        dist_thresh_frac=0.7,
        min_peaks=2,
        min_region_area=100
    )

    assert len(ws_res) >= 2, f"Expected watershed to split merged circles into >= 2 instances, got {len(ws_res)}"
    for inst in ws_res:
        assert inst["class_id"] == 0
        assert inst["confidence"] == 0.95
        assert np.sum(inst["mask"]) > 0
    print("[OK] test_multi_peak_merged_mask_watershed passed")


def test_boundary_touching_mask():
    """Verify post-processing handles masks touching image boundary."""
    mask = np.zeros((100, 100), dtype=np.uint8)
    cv2.rectangle(mask, (0, 0), (30, 30), 1, -1)

    refined = apply_morphological_refinement(mask)
    assert np.sum(refined) > 0, "Boundary touching mask should be preserved."
    print("[OK] test_boundary_touching_mask passed")


def test_postprocess_instances_pipeline_modes():
    """Test full post-processing pipeline modes (none, watershed, morphology, full)."""
    mask = np.zeros((100, 100), dtype=np.uint8)
    cv2.rectangle(mask, (20, 20), (60, 60), 1, -1)

    raw_instances = [{
        "instance_id": 1,
        "class_id": 2,
        "class_name": "paper_cardboard",
        "confidence": 0.88,
        "bbox": [20.0, 20.0, 60.0, 60.0],
        "mask": mask
    }]

    for mode in ["none", "watershed", "morphology", "full"]:
        out_insts = postprocess_instances(raw_instances, mode=mode)
        assert isinstance(out_insts, list)
        assert len(out_insts) >= 1
        assert out_insts[0]["class_id"] == 2
        assert out_insts[0]["confidence"] == 0.88
    print("[OK] test_postprocess_instances_pipeline_modes passed")


def run_all_tests():
    print("==========================================")
    print("TrashTrace Post-Processing Unit Test Suite")
    print("==========================================")
    test_empty_mask_handling()
    test_tiny_single_pixel_mask()
    test_multi_peak_merged_mask_watershed()
    test_boundary_touching_mask()
    test_postprocess_instances_pipeline_modes()
    print("==========================================")
    print("RESULT: PASS - All post-processing unit tests passed.")


if __name__ == "__main__":
    run_all_tests()
