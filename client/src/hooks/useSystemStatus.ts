import type { ModelConnectionStatus } from '@/types'

/**
 * Minimal hook providing current model connection state.
 * Will return live connection status after ML backend integration.
 */
export function useSystemStatus(): { modelStatus: ModelConnectionStatus; isReady: boolean } {
  return {
    modelStatus: 'standby',
    isReady: true,
  }
}
