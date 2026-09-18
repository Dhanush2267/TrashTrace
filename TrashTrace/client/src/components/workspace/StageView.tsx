import React from 'react'
import type { ImageFileMetadata, PipelineStageId, StageResult, VisualizationSettings } from '@/types'
import { getStageConfig } from '@/lib/pipelineConfig'
import { ImageViewport } from '@/components/workspace/ImageViewport'
import { MaskOverlay } from '@/components/workspace/MaskOverlay'
import { StageComparison } from '@/components/workspace/StageComparison'
import { cn } from '@/lib/utils'

interface StageViewProps {
  image: ImageFileMetadata
  stageId: PipelineStageId
  stageResult?: StageResult
  settings: VisualizationSettings
  onSelectInstance: (instanceId: string | null) => void
  isCompareActive?: boolean
  beforeResult?: StageResult
  beforeLabel?: string
  afterLabel?: string
  onCloseCompare?: () => void
  className?: string
}

export const StageView: React.FC<StageViewProps> = ({
  image,
  stageId,
  stageResult,
  settings,
  onSelectInstance,
  isCompareActive = false,
  beforeResult,
  beforeLabel = 'Upstream Stage',
  afterLabel = 'Current Stage',
  onCloseCompare,
  className,
}) => {
  const config = getStageConfig(stageId)
  const isInput = stageId === 'input'
  const hasInstances = Boolean(stageResult && stageResult.instances.length > 0)

  // Render Split-View / Comparison if active and valid upstream result exists
  if (isCompareActive && beforeResult && stageResult && onCloseCompare) {
    return (
      <StageComparison
        image={image}
        beforeResult={beforeResult}
        afterResult={stageResult}
        beforeLabel={beforeLabel}
        afterLabel={afterLabel}
        settings={settings}
        onSelectInstance={onSelectInstance}
        onClose={onCloseCompare}
        className={className}
      />
    )
  }

  return (
    <div className={cn('w-full flex flex-col gap-3', className)}>
      <div className="relative">
        <ImageViewport image={image}>
          {/* 1. Mask and Bounding Box SVG Overlay (when stage has results) */}
          {hasInstances && stageResult && (
            <MaskOverlay
              instances={stageResult.instances}
              imageWidth={image.width}
              imageHeight={image.height}
              settings={settings}
              onSelectInstance={onSelectInstance}
            />
          )}

          {/* 2. Waiting State Overlay (when no inference results exist for downstream stage) */}
          {!isInput && !hasInstances && (
            <div
              className="absolute inset-0 bg-white/40 backdrop-blur-[1.5px] rounded-md flex flex-col items-center justify-center p-6 text-center select-none"
              aria-label={`${config.title} waiting state`}
            >
              <div className="max-w-md bg-white/95 rounded-xl border border-[#E5E7EB] shadow-md p-6 flex flex-col items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[#2563EB]">
                  <svg
                    className="w-5 h-5 text-[#2563EB]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                </div>

                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-[#111827]">
                    {config.title}
                  </h3>
                  <p className="text-xs text-[#4B5563] leading-relaxed">
                    {config.waitingMessage}
                  </p>
                  <p className="text-[11px] text-[#9CA3AF] pt-1">
                    {config.roleExplanation}
                  </p>
                </div>

                <div className="pt-1 flex items-center gap-1.5 text-[11px] font-mono text-[#6B7280] bg-[#F9FAFB] px-2.5 py-1 rounded-md border border-[#E5E7EB]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" aria-hidden="true" />
                  <span>Pipeline State: Ready for Model Inference</span>
                </div>
              </div>
            </div>
          )}
        </ImageViewport>
      </div>
    </div>
  )
}
