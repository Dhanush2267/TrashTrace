import type {
  PipelineStageId,
  StageResult,
  SegmentationInstance,
  StageAnalysisMetrics,
  RuntimeInfo,
} from '@/types'
import type { BackendInstance, BackendPredictResponse } from './api'

export interface ClassDefinition {
  id: string
  name: string
  colorHex: string
}

export const CANONICAL_CLASSES: Record<string | number, ClassDefinition> = {
  0: { id: 'plastic', name: 'Plastic', colorHex: '#00FF7F' },
  plastic: { id: 'plastic', name: 'Plastic', colorHex: '#00FF7F' },

  1: { id: 'metal', name: 'Metal', colorHex: '#FFBF00' },
  metal: { id: 'metal', name: 'Metal', colorHex: '#FFBF00' },

  2: { id: 'paper_cardboard', name: 'Paper / Cardboard', colorHex: '#FF69B4' },
  paper_cardboard: { id: 'paper_cardboard', name: 'Paper / Cardboard', colorHex: '#FF69B4' },
  paper: { id: 'paper_cardboard', name: 'Paper / Cardboard', colorHex: '#FF69B4' },

  3: { id: 'glass', name: 'Glass', colorHex: '#00D7FF' },
  glass: { id: 'glass', name: 'Glass', colorHex: '#00D7FF' },

  4: { id: 'other', name: 'Other', colorHex: '#9370DB' },
  other: { id: 'other', name: 'Other', colorHex: '#9370DB' },
}

export function resolveClassDefinition(classIdOrName: number | string): ClassDefinition {
  const def = CANONICAL_CLASSES[classIdOrName]
  if (def) return def

  const strKey = String(classIdOrName).toLowerCase()
  if (CANONICAL_CLASSES[strKey]) return CANONICAL_CLASSES[strKey]

  return {
    id: strKey,
    name: String(classIdOrName),
    colorHex: '#9370DB',
  }
}

export function adaptBackendInstance(inst: BackendInstance): SegmentationInstance {
  const classDef = resolveClassDefinition(inst.class_id ?? inst.class_name)

  const bboxNorm = inst.bbox_normalized || [0, 0, 1, 1]
  const xmin = Math.max(0, Math.min(1, bboxNorm[0] ?? 0))
  const ymin = Math.max(0, Math.min(1, bboxNorm[1] ?? 0))
  const xmax = Math.max(xmin, Math.min(1, bboxNorm[2] ?? 1))
  const ymax = Math.max(ymin, Math.min(1, bboxNorm[3] ?? 1))

  const width = Math.max(0.0001, xmax - xmin)
  const height = Math.max(0.0001, ymax - ymin)

  const rawPoly = inst.mask_polygon_normalized || []
  const polygon: Array<[number, number]> = rawPoly.map(([px, py]) => [
    Math.max(0, Math.min(1, px)),
    Math.max(0, Math.min(1, py)),
  ])

  // Confidence is 0..1 from backend
  const confidence = typeof inst.confidence === 'number' ? inst.confidence : 0

  return {
    instanceId: String(inst.instance_id),
    classId: classDef.id,
    className: classDef.name,
    confidence,
    colorHex: classDef.colorHex,
    boundingBox: {
      x: xmin,
      y: ymin,
      width,
      height,
    },
    polygon,
    maskStatus: inst.is_touching_boundary ? 'noisy' : 'clean',
    notes: `Area: ${inst.mask_area_px ?? 0} px²${inst.is_touching_boundary ? ' (Touches boundary)' : ''}`,
  }
}

function calculateTelemetry(
  instances: SegmentationInstance[],
  latencyMs: number
): StageAnalysisMetrics {
  if (instances.length === 0) {
    return {
      objectsDetected: 0,
      classesCount: 0,
      confidenceMean: 0,
      latencyMs: Math.round(latencyMs),
    }
  }

  const uniqueClasses = new Set(instances.map((i) => i.classId))
  const sumConfidence = instances.reduce((acc, i) => acc + i.confidence, 0)
  const meanConfPct = Number(((sumConfidence / instances.length) * 100).toFixed(1))

  return {
    objectsDetected: instances.length,
    classesCount: uniqueClasses.size,
    confidenceMean: meanConfPct,
    latencyMs: Math.round(latencyMs),
  }
}

export function adaptApiResponseToStageResults(
  response: BackendPredictResponse
): Record<PipelineStageId, StageResult> {
  const meta = response.processing_metadata || {}
  const totalMs = meta.total_time_ms ?? 0
  const inferMs = meta.inference_time_ms ?? 0
  const postMs = meta.postprocess_time_ms ?? 0
  const dims = meta.image_dimensions || { width: 640, height: 640 }

  const yoloRaw = response.stages?.yolo || response.instances || []
  const wsRaw = response.stages?.watershed || response.instances || []
  const morphRaw = response.stages?.morphology || response.instances || []
  const finalRaw = response.stages?.final || response.instances || []

  const yoloInsts = yoloRaw.map(adaptBackendInstance)
  const wsInsts = wsRaw.map(adaptBackendInstance)
  const morphInsts = morphRaw.map(adaptBackendInstance)
  const finalInsts = finalRaw.map(adaptBackendInstance)

  const runtimeInfo: RuntimeInfo = {
    latencyMs: Math.round(totalMs),
    objectsDetected: finalInsts.length,
    classesDetected: new Set(finalInsts.map((i) => i.classId)).size,
    fps: totalMs > 0 ? Math.round(1000 / totalMs) : null,
    model: 'YOLO26n-Seg',
    version: '1.0.0',
    inputSize: `${dims.width}x${dims.height}`,
    device: 'CUDA:0',
    memoryMb: null,
  }

  const evalBackend = response.evaluation_metrics
  const evaluationMetrics = evalBackend
    ? {
        maskAp50: evalBackend.mask_ap50 ?? null,
        ap75: evalBackend.ap75 ?? null,
        mAp50_95: evalBackend.map50_95 ?? null,
        precision: evalBackend.precision ?? null,
        recall: evalBackend.recall ?? null,
        f1: evalBackend.f1 ?? null,
      }
    : undefined

  const perClassApMap = evalBackend?.per_class_ap || {}
  const buildPerClassRows = (instances: SegmentationInstance[]) => {
    const map = new Map<string, { count: number; name: string; colorHex: string }>()
    for (const inst of instances) {
      if (!map.has(inst.classId)) {
        map.set(inst.classId, { count: 1, name: inst.className, colorHex: inst.colorHex })
      } else {
        const entry = map.get(inst.classId)!
        entry.count += 1
      }
    }
    return Array.from(map.entries()).map(([classId, data]) => ({
      id: classId,
      name: data.name,
      colorHex: data.colorHex,
      instances: data.count,
      ap: perClassApMap[classId] ?? null,
    }))
  }

  return {
    input: {
      stageId: 'input',
      instances: [],
      telemetry: {
        objectsDetected: 0,
        classesCount: 0,
        confidenceMean: null,
        latencyMs: 0,
      },
      evaluationMetrics,
      perClassAp: [],
      runtimeInfo,
      isDemoFixture: false,
      notes: 'Raw uploaded image before model processing.',
    },
    yolo: {
      stageId: 'yolo',
      instances: yoloInsts,
      telemetry: calculateTelemetry(yoloInsts, inferMs),
      evaluationMetrics,
      perClassAp: buildPerClassRows(yoloInsts),
      runtimeInfo,
      isDemoFixture: false,
      notes: 'Raw YOLO26n-Seg deep learning detections and prototype masks.',
    },
    watershed: {
      stageId: 'watershed',
      instances: wsInsts,
      telemetry: calculateTelemetry(wsInsts, inferMs + postMs * 0.5),
      evaluationMetrics,
      perClassAp: buildPerClassRows(wsInsts),
      runtimeInfo,
      isDemoFixture: false,
      notes: 'Distance transform + selective watershed instance separation.',
    },
    morphology: {
      stageId: 'morphology',
      instances: morphInsts,
      telemetry: calculateTelemetry(morphInsts, inferMs + postMs),
      evaluationMetrics,
      perClassAp: buildPerClassRows(morphInsts),
      runtimeInfo,
      isDemoFixture: false,
      notes: 'Morphological opening/closing mask boundary cleaning.',
    },
    final: {
      stageId: 'final',
      instances: finalInsts,
      telemetry: calculateTelemetry(finalInsts, totalMs),
      evaluationMetrics,
      perClassAp: buildPerClassRows(finalInsts),
      runtimeInfo,
      isDemoFixture: false,
      notes: 'Final consolidated waste instance segmentation.',
    },
  }
}
