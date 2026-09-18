export interface ApiClientConfig {
  baseUrl: string
  timeoutMs: number
}

export const API_CONFIG: ApiClientConfig = {
  baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  timeoutMs: 30000,
}

export interface BackendInstance {
  instance_id: number
  class_id: number
  class_name: string
  confidence: number
  bbox: [number, number, number, number]
  bbox_normalized: [number, number, number, number]
  mask_polygon_normalized: Array<[number, number]>
  mask_area_px: number
  is_touching_boundary: boolean
}

export interface BackendEvaluationMetrics {
  mask_ap50?: number
  ap75?: number
  map50_95?: number
  precision?: number
  recall?: number
  f1?: number
  per_class_ap?: Record<string, number>
}

export interface BackendPredictResponse {
  status: string
  message: string
  processing_metadata: {
    postprocess_mode: string
    inference_time_ms: number
    postprocess_time_ms: number
    total_time_ms: number
    image_dimensions: {
      width: number
      height: number
    }
  }
  summary: {
    total_instances_detected: number
    class_counts: Record<string, number>
  }
  evaluation_metrics?: BackendEvaluationMetrics | null
  instances: BackendInstance[]
  stages?: {
    yolo: BackendInstance[]
    watershed: BackendInstance[]
    morphology: BackendInstance[]
    final: BackendInstance[]
  }
  visualizations?: {
    annotated_image_base64?: string
  }
}

export interface BackendHealthResponse {
  status: string
  service: string
  model: string
  device: string
  evaluation_metrics?: BackendEvaluationMetrics | null
}

export interface PredictOptions {
  conf?: number
  postprocess?: 'none' | 'watershed' | 'morphology' | 'full'
}

export const mlApiService = {
  isConfigured: (): boolean => {
    return Boolean(API_CONFIG.baseUrl)
  },

  async healthCheck(signal?: AbortSignal): Promise<BackendHealthResponse> {
    const url = `${API_CONFIG.baseUrl}/health`
    const timeoutSignal = AbortSignal.timeout(API_CONFIG.timeoutMs)
    const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal

    const response = await fetch(url, {
      method: 'GET',
      signal: combinedSignal,
    })

    if (!response.ok) {
      throw new Error(`Health check failed with status ${response.status}`)
    }

    return (await response.json()) as BackendHealthResponse
  },

  async predict(
    file: File,
    options: PredictOptions = {},
    signal?: AbortSignal
  ): Promise<BackendPredictResponse> {
    const { conf = 0.25, postprocess = 'full' } = options
    const url = new URL(`${API_CONFIG.baseUrl}/api/predict`)
    url.searchParams.set('conf', String(conf))
    url.searchParams.set('postprocess', postprocess)

    const formData = new FormData()
    formData.append('file', file)

    const timeoutSignal = AbortSignal.timeout(API_CONFIG.timeoutMs)
    const combinedSignal = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal

    const response = await fetch(url.toString(), {
      method: 'POST',
      body: formData,
      signal: combinedSignal,
    })

    if (!response.ok) {
      let errorDetail = `Inference failed with status ${response.status}`
      try {
        const errJson = await response.json()
        if (errJson.detail) {
          errorDetail = errJson.detail
        }
      } catch {
        // ignore JSON parse error
      }
      throw new Error(errorDetail)
    }

    return (await response.json()) as BackendPredictResponse
  },
}

