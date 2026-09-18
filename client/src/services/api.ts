/**
 * API Service Layer Placeholder
 *
 * Real-World Waste Instance Segmentation
 *
 * NOTE: The ML and inference backend is actively under development by the ML team.
 * Endpoints, request payloads, and prediction response contracts will be integrated
 * once the model serving API specifications are delivered in subsequent phases.
 *
 * Do not define mock schemas or synthetic endpoints here until the contract is finalized.
 */

export interface ApiClientConfig {
  baseUrl: string
  timeoutMs: number
}

export const API_CONFIG: ApiClientConfig = {
  baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  timeoutMs: 30000,
}

/**
 * Placeholder service client for future ML backend integration.
 */
export const mlApiService = {
  isConfigured: (): boolean => {
    return Boolean(API_CONFIG.baseUrl)
  },
  // Future endpoints (e.g., /infer, /health, /metrics) will be registered here.
}
