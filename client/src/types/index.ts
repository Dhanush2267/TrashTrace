/**
 * Domain types for the TrashTrace Waste Instance Segmentation frontend.
 *
 * Architecture contract: these types define the boundary between the
 * visualization layer and the ML inference pipeline. When real model
 * integration is performed, populate StageResult using these types
 * without modifying the visualization components.
 */

export type ModelConnectionStatus = 'standby' | 'disconnected' | 'connecting' | 'connected'

/**
 * Real metadata extracted from user uploaded image files.
 */
export interface ImageFileMetadata {
  id: string
  name: string
  sizeBytes: number
  formattedSize: string
  mimeType: string
  width: number
  height: number
  aspectRatio: number
  previewUrl: string
  lastModified: number
  file: File
}

export type SupportedImageFormat = 'image/jpeg' | 'image/png' | 'image/webp'

export interface ImageValidationError {
  code: 'INVALID_TYPE' | 'FILE_TOO_LARGE' | 'LOAD_FAILED'
  message: string
}

/**
 * Pipeline Stage Identifiers representing the real-world waste segmentation story:
 * Input -> YOLO -> Watershed -> Morphological Refinement -> Final Result
 */
export type PipelineStageId = 'input' | 'yolo' | 'watershed' | 'morphology' | 'final'

export type StageProcessingStatus = 'ready' | 'waiting' | 'processing' | 'error' | 'unavailable'

export interface PipelineStageConfig {
  id: PipelineStageId
  label: string
  title: string
  subtitle: string
  description: string
  waitingMessage: string
  roleExplanation: string
}

/**
 * Normalized 0..1 bounding box coordinate system (left, top, width, height).
 */
export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

export type MaskStatusType = 'clean' | 'merged' | 'noisy' | 'separated' | 'refined'

/**
 * Segmentation instance domain model.
 */
export interface SegmentationInstance {
  instanceId: string
  classId: string
  className: string
  confidence: number // 0 to 1
  colorHex: string
  boundingBox: BoundingBox
  polygon: Array<[number, number]> // Normalized 0..1 [x, y] coordinates
  maskStatus?: MaskStatusType
  notes?: string
}

/**
 * Telemetry model for real inference data (null/undefined when not yet available).
 */
export interface StageAnalysisMetrics {
  objectsDetected?: number | null
  classesCount?: number | null
  confidenceMean?: number | null
  latencyMs?: number | null
}

/**
 * Model evaluation metrics model (Mask AP, Precision, Recall, etc.).
 * All fields are optional — use null to explicitly represent "not available".
 */
export interface EvaluationMetrics {
  maskAp50?: number | null
  ap75?: number | null
  mAp50_95?: number | null
  precision?: number | null
  recall?: number | null
  f1?: number | null
}

/**
 * Per-class AP performance data.
 * instances and ap are nullable — display '—' when not yet measured.
 */
export interface PerClassApRow {
  id: string
  name: string
  colorHex?: string
  instances?: number | null
  ap?: number | null
}

/**
 * Runtime telemetry and model identification.
 * All fields nullable — show '—' until real inference is connected.
 */
export interface RuntimeInfo {
  latencyMs?: number | null
  objectsDetected?: number | null
  classesDetected?: number | null
  fps?: number | null
  model?: string | null
  version?: string | null
  inputSize?: string | null
  device?: string | null
  memoryMb?: number | null
}

/**
 * Data-driven class category model (for ClassLegend breakdown).
 */
export interface ClassCategoryItem {
  id: string
  name: string
  colorHex?: string
  count?: number
}

/**
 * Result structure produced by each pipeline stage.
 * isDemoFixture: true — visualization fixture, never a real benchmark measurement.
 * isDemoFixture: false — live model output (post-integration).
 */
export interface StageResult {
  stageId: PipelineStageId
  instances: SegmentationInstance[]
  telemetry?: StageAnalysisMetrics
  evaluationMetrics?: EvaluationMetrics
  runtimeInfo?: RuntimeInfo
  perClassAp?: PerClassApRow[]
  isDemoFixture: boolean
  notes?: string
}

/**
 * Presentation scenario identifiers.
 */
export type DemoScenarioId = 'normal' | 'touching' | 'noisy' | 'difficult'

export interface DemoScenario {
  id: DemoScenarioId
  title: string
  label: string
  tagline: string
  storyExplanation: string
  stageResults: Record<PipelineStageId, StageResult>
}

/**
 * Interactive visualization settings.
 */
export interface VisualizationSettings {
  showMasks: boolean
  showBoundingBoxes: boolean
  showLabels: boolean
  maskOpacity: number // 0.1 to 1.0
  selectedInstanceId: string | null
  highlightedClassId: string | null
}
