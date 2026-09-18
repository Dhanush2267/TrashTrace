/**
 * Isolated Demonstration Fixtures for TrashTrace
 *
 * NOTE: These fixtures exist strictly for pre-review interactive demonstration
 * of the computer vision pipeline story. They are NOT real ML model outputs
 * and must NEVER be presented as benchmark measurements.
 */

import type { DemoScenario, DemoScenarioId, SegmentationInstance, StageResult } from '@/types'

// Reusable normalized polygon definitions [x, y] in range 0..1

// Clean plastic bottle
const POLYGON_BOTTLE: Array<[number, number]> = [
  [0.18, 0.22], [0.22, 0.22], [0.24, 0.26], [0.26, 0.35],
  [0.27, 0.55], [0.26, 0.72], [0.23, 0.75], [0.17, 0.75],
  [0.14, 0.72], [0.13, 0.55], [0.14, 0.35], [0.16, 0.26],
]

// Clean metal can
const POLYGON_CAN: Array<[number, number]> = [
  [0.48, 0.38], [0.58, 0.38], [0.60, 0.44], [0.60, 0.68],
  [0.57, 0.72], [0.49, 0.72], [0.46, 0.68], [0.46, 0.44],
]

// Clean paper cup/carton
const POLYGON_PAPER: Array<[number, number]> = [
  [0.72, 0.30], [0.86, 0.28], [0.88, 0.36], [0.85, 0.68],
  [0.82, 0.74], [0.74, 0.74], [0.71, 0.68], [0.69, 0.36],
]

// Merged touching cluster (YOLO raw output for touching items)
const POLYGON_MERGED_TOUCHING: Array<[number, number]> = [
  [0.32, 0.28], [0.42, 0.26], [0.52, 0.30], [0.65, 0.35],
  [0.68, 0.50], [0.66, 0.68], [0.58, 0.74], [0.45, 0.72],
  [0.38, 0.75], [0.30, 0.70], [0.28, 0.52], [0.30, 0.36],
]

// Separated item A after watershed
const POLYGON_SEPARATED_A: Array<[number, number]> = [
  [0.30, 0.32], [0.42, 0.28], [0.46, 0.38], [0.45, 0.55],
  [0.44, 0.68], [0.36, 0.72], [0.30, 0.68], [0.28, 0.48],
]

// Separated item B after watershed
const POLYGON_SEPARATED_B: Array<[number, number]> = [
  [0.47, 0.34], [0.62, 0.36], [0.66, 0.50], [0.64, 0.66],
  [0.56, 0.72], [0.48, 0.70], [0.46, 0.54], [0.46, 0.42],
]

// Noisy jagged mask (YOLO raw output with boundary noise & artifacts)
const POLYGON_NOISY: Array<[number, number]> = [
  [0.35, 0.25], [0.39, 0.27], [0.42, 0.23], [0.48, 0.28],
  [0.52, 0.24], [0.58, 0.30], [0.64, 0.26], [0.66, 0.38],
  [0.72, 0.42], [0.68, 0.48], [0.73, 0.56], [0.67, 0.64],
  [0.62, 0.73], [0.55, 0.68], [0.49, 0.76], [0.43, 0.69],
  [0.38, 0.75], [0.33, 0.68], [0.36, 0.58], [0.29, 0.52],
  [0.34, 0.44], [0.28, 0.36], [0.36, 0.32],
]

// Refined smooth mask after morphology
const POLYGON_REFINED: Array<[number, number]> = [
  [0.36, 0.26], [0.46, 0.25], [0.58, 0.28], [0.66, 0.36],
  [0.69, 0.48], [0.66, 0.62], [0.58, 0.71], [0.47, 0.72],
  [0.37, 0.71], [0.32, 0.61], [0.31, 0.46], [0.33, 0.34],
]

// Standard instances for Scenario 1 (Normal)
const NORMAL_INSTANCES: SegmentationInstance[] = [
  {
    instanceId: 'inst-normal-1',
    classId: 'plastic',
    className: 'Plastic Bottle',
    confidence: 0.96,
    colorHex: '#0284C7', // Sky Blue
    boundingBox: { x: 0.13, y: 0.22, width: 0.14, height: 0.53 },
    polygon: POLYGON_BOTTLE,
    maskStatus: 'clean',
    notes: 'Isolated plastic container with high-confidence edge definition.',
  },
  {
    instanceId: 'inst-normal-2',
    classId: 'metal',
    className: 'Aluminum Can',
    confidence: 0.92,
    colorHex: '#D97706', // Amber
    boundingBox: { x: 0.46, y: 0.38, width: 0.14, height: 0.34 },
    polygon: POLYGON_CAN,
    maskStatus: 'clean',
    notes: 'Metallic beverage container clearly separated from adjacent surfaces.',
  },
  {
    instanceId: 'inst-normal-3',
    classId: 'paper',
    className: 'Paper Carton',
    confidence: 0.95,
    colorHex: '#059669', // Emerald
    boundingBox: { x: 0.69, y: 0.28, width: 0.19, height: 0.46 },
    polygon: POLYGON_PAPER,
    maskStatus: 'clean',
    notes: 'Cardboard carton exhibiting crisp rectangular boundary contours.',
  },
]

// Normal scenario stage result creator
function createNormalStageResult(stageId: any): StageResult {
  return {
    stageId,
    instances: NORMAL_INSTANCES,
    telemetry: {
      objectsDetected: 3,
      classesCount: 3,
      confidenceMean: 94.3,
      latencyMs: stageId === 'yolo' ? 24 : stageId === 'watershed' ? 29 : stageId === 'morphology' ? 33 : 36,
    },
    isDemoFixture: true,
    notes: 'Well-spaced waste objects with distinct boundaries.',
  }
}

// Touching scenario: YOLO produces merged instance
const TOUCHING_YOLO_INSTANCES: SegmentationInstance[] = [
  {
    instanceId: 'inst-merged-1',
    classId: 'cluster',
    className: 'Merged Waste Cluster',
    confidence: 0.74,
    colorHex: '#8B5CF6', // Purple
    boundingBox: { x: 0.28, y: 0.26, width: 0.40, height: 0.49 },
    polygon: POLYGON_MERGED_TOUCHING,
    maskStatus: 'merged',
    notes: 'Touching plastic bottle and beverage can merged into a single mask contour.',
  },
]

// Touching scenario: Watershed separates them
const TOUCHING_SEPARATED_INSTANCES: SegmentationInstance[] = [
  {
    instanceId: 'inst-sep-1',
    classId: 'plastic',
    className: 'Plastic Bottle',
    confidence: 0.91,
    colorHex: '#0284C7',
    boundingBox: { x: 0.28, y: 0.28, width: 0.18, height: 0.44 },
    polygon: POLYGON_SEPARATED_A,
    maskStatus: 'separated',
    notes: 'Topological ridge detected separation separating bottle from touching can.',
  },
  {
    instanceId: 'inst-sep-2',
    classId: 'metal',
    className: 'Crushed Can',
    confidence: 0.88,
    colorHex: '#D97706',
    boundingBox: { x: 0.46, y: 0.34, width: 0.20, height: 0.38 },
    polygon: POLYGON_SEPARATED_B,
    maskStatus: 'separated',
    notes: 'Secondary basin isolated into independent metallic instance mask.',
  },
]

// Noisy scenario: YOLO produces noisy jagged mask
const NOISY_YOLO_INSTANCES: SegmentationInstance[] = [
  {
    instanceId: 'inst-noisy-1',
    classId: 'plastic',
    className: 'Degraded Plastic Wrap',
    confidence: 0.81,
    colorHex: '#EC4899', // Pink
    boundingBox: { x: 0.28, y: 0.23, width: 0.45, height: 0.53 },
    polygon: POLYGON_NOISY,
    maskStatus: 'noisy',
    notes: 'Boundary exhibits pixel noise, spurious spikes, and internal void artifacts.',
  },
]

// Noisy scenario: Morphology produces smooth refined mask
const NOISY_REFINED_INSTANCES: SegmentationInstance[] = [
  {
    instanceId: 'inst-refined-1',
    classId: 'plastic',
    className: 'Degraded Plastic Wrap',
    confidence: 0.93,
    colorHex: '#0284C7',
    boundingBox: { x: 0.31, y: 0.25, width: 0.38, height: 0.47 },
    polygon: POLYGON_REFINED,
    maskStatus: 'refined',
    notes: 'Erosion and dilation smoothed jagged spikes and closed internal contour voids.',
  },
]

export const DEMO_SCENARIOS: Record<DemoScenarioId, DemoScenario> = {
  normal: {
    id: 'normal',
    title: 'Normal Scene',
    label: 'Standard Detection',
    tagline: 'YOLO handles isolated waste items',
    storyExplanation:
      'In clear scenes with isolated objects, YOLO produces high-fidelity bounding boxes and masks without requiring heavy refinement.',
    stageResults: {
      input: { stageId: 'input', instances: [], isDemoFixture: true },
      yolo: createNormalStageResult('yolo'),
      watershed: createNormalStageResult('watershed'),
      morphology: createNormalStageResult('morphology'),
      final: createNormalStageResult('final'),
    },
  },

  touching: {
    id: 'touching',
    title: 'Touching Objects',
    label: 'Instance Disambiguation',
    tagline: 'YOLO produces merged masks; Watershed separates touching instances',
    storyExplanation:
      'When items overlap or touch, YOLO often merges them into a single blob. Watershed topological analysis calculates distance transforms to split touching instances into clean individual masks.',
    stageResults: {
      input: { stageId: 'input', instances: [], isDemoFixture: true },
      yolo: {
        stageId: 'yolo',
        instances: TOUCHING_YOLO_INSTANCES,
        telemetry: { objectsDetected: 1, classesCount: 1, confidenceMean: 74.0, latencyMs: 25 },
        isDemoFixture: true,
        notes: 'Touching instances incorrectly merged into a single continuous mask.',
      },
      watershed: {
        stageId: 'watershed',
        instances: TOUCHING_SEPARATED_INSTANCES,
        telemetry: { objectsDetected: 2, classesCount: 2, confidenceMean: 89.5, latencyMs: 34 },
        isDemoFixture: true,
        notes: 'Watershed distance transform splits the merged mask into 2 distinct instances.',
      },
      morphology: {
        stageId: 'morphology',
        instances: TOUCHING_SEPARATED_INSTANCES,
        telemetry: { objectsDetected: 2, classesCount: 2, confidenceMean: 90.2, latencyMs: 38 },
        isDemoFixture: true,
        notes: 'Separated contours preserved and smoothed.',
      },
      final: {
        stageId: 'final',
        instances: TOUCHING_SEPARATED_INSTANCES,
        telemetry: { objectsDetected: 2, classesCount: 2, confidenceMean: 90.5, latencyMs: 41 },
        isDemoFixture: true,
        notes: 'Final consolidated scene delivers separated individual instances.',
      },
    },
  },

  noisy: {
    id: 'noisy',
    title: 'Noisy Mask Refinement',
    label: 'Contour Optimization',
    tagline: 'Mathematical morphology operators clean noisy boundary artifacts',
    storyExplanation:
      'Degraded, crumpled, or transparent waste can produce jagged, noisy mask borders with holes. Morphological opening and closing filters eliminate noise while preserving object boundaries.',
    stageResults: {
      input: { stageId: 'input', instances: [], isDemoFixture: true },
      yolo: {
        stageId: 'yolo',
        instances: NOISY_YOLO_INSTANCES,
        telemetry: { objectsDetected: 1, classesCount: 1, confidenceMean: 81.0, latencyMs: 26 },
        isDemoFixture: true,
        notes: 'Raw YOLO mask contains perimeter noise and irregular spikes.',
      },
      watershed: {
        stageId: 'watershed',
        instances: NOISY_YOLO_INSTANCES,
        telemetry: { objectsDetected: 1, classesCount: 1, confidenceMean: 81.5, latencyMs: 30 },
        isDemoFixture: true,
      },
      morphology: {
        stageId: 'morphology',
        instances: NOISY_REFINED_INSTANCES,
        telemetry: { objectsDetected: 1, classesCount: 1, confidenceMean: 93.0, latencyMs: 34 },
        isDemoFixture: true,
        notes: 'Morphological operators eliminate boundary jitter and seal contour voids.',
      },
      final: {
        stageId: 'final',
        instances: NOISY_REFINED_INSTANCES,
        telemetry: { objectsDetected: 1, classesCount: 1, confidenceMean: 93.0, latencyMs: 37 },
        isDemoFixture: true,
      },
    },
  },

  difficult: {
    id: 'difficult',
    title: 'Difficult Real-World Scene',
    label: 'Evaluation Baseline',
    tagline: 'Real-world complex scene awaiting trained model evaluation',
    storyExplanation:
      'Real-world benchmark evaluation scene. Official AP50, precision, recall, and runtime metrics will be computed once the final trained model is benchmarked.',
    stageResults: {
      input: { stageId: 'input', instances: [], isDemoFixture: true },
      yolo: {
        stageId: 'yolo',
        instances: [],
        telemetry: { objectsDetected: null, classesCount: null, confidenceMean: null, latencyMs: null },
        isDemoFixture: true,
        notes: 'Evaluation benchmark scene. Real metric measurements are awaiting model completion.',
      },
      watershed: {
        stageId: 'watershed',
        instances: [],
        telemetry: { objectsDetected: null, classesCount: null, confidenceMean: null, latencyMs: null },
        isDemoFixture: true,
      },
      morphology: {
        stageId: 'morphology',
        instances: [],
        telemetry: { objectsDetected: null, classesCount: null, confidenceMean: null, latencyMs: null },
        isDemoFixture: true,
      },
      final: {
        stageId: 'final',
        instances: [],
        telemetry: { objectsDetected: null, classesCount: null, confidenceMean: null, latencyMs: null },
        isDemoFixture: true,
      },
    },
  },
}

export function getDemoScenario(id: DemoScenarioId): DemoScenario {
  return DEMO_SCENARIOS[id] || DEMO_SCENARIOS.normal
}
