import type { PipelineStageId, PipelineStageConfig } from '@/types'

export const PIPELINE_STAGES: readonly PipelineStageConfig[] = [
  {
    id: 'input',
    label: 'Input',
    title: 'Original Input',
    subtitle: 'Source Image',
    description: 'Original uploaded image before computer vision processing.',
    waitingMessage: 'Awaiting image upload to initialize workspace.',
    roleExplanation: 'Serves as the raw optical baseline for geometry and feature extraction.',
  },
  {
    id: 'yolo',
    label: 'YOLO',
    title: 'YOLO Detection',
    subtitle: 'Object Detection & Raw Masks',
    description: 'Deep learning instance segmentation producing initial bounding boxes and candidate masks.',
    waitingMessage: 'Model output not available yet. Waiting for inference pipeline.',
    roleExplanation: 'Detects waste objects and generates initial bounding boxes and prototype masks.',
  },
  {
    id: 'watershed',
    label: 'Watershed',
    title: 'Watershed Separation',
    subtitle: 'Cluster Disambiguation',
    description: 'Topological separation algorithm isolating touching and overlapping waste instances.',
    waitingMessage: 'Waiting for upstream segmentation output.',
    roleExplanation: 'Resolves merged clusters where multiple adjacent waste items share mask contours.',
  },
  {
    id: 'morphology',
    label: 'Morphology',
    title: 'Morphological Refinement',
    subtitle: 'Contour Optimization',
    description: 'Mathematical morphology operators smoothing mask edges, closing voids, and reducing noise.',
    waitingMessage: 'Waiting for refinement output.',
    roleExplanation: 'Removes boundary artifacts and fills internal voids for high-fidelity instance outlines.',
  },
  {
    id: 'final',
    label: 'Final',
    title: 'Final Segmentation',
    subtitle: 'Consolidated Predictions',
    description: 'Consolidated instance segmentation with multi-class boundaries and confidence scoring.',
    waitingMessage: 'Waiting for the complete inference pipeline.',
    roleExplanation: 'Delivers the production-ready segmented scene with accurate instance localization.',
  },
] as const

export const STAGE_MAP: Record<PipelineStageId, PipelineStageConfig> = PIPELINE_STAGES.reduce(
  (acc, stage) => {
    acc[stage.id] = stage
    return acc
  },
  {} as Record<PipelineStageId, PipelineStageConfig>
)

export function getStageConfig(stageId: PipelineStageId): PipelineStageConfig {
  return STAGE_MAP[stageId] || STAGE_MAP.input
}
