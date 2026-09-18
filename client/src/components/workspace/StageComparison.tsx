import React, { useState } from 'react'
import type { ImageFileMetadata, StageResult, VisualizationSettings } from '@/types'
import { MaskOverlay } from '@/components/workspace/MaskOverlay'
import { cn } from '@/lib/utils'

interface StageComparisonProps {
  image: ImageFileMetadata
  beforeResult: StageResult
  afterResult: StageResult
  beforeLabel: string
  afterLabel: string
  settings: VisualizationSettings
  onSelectInstance: (id: string | null) => void
  onClose: () => void
  className?: string
}

export const StageComparison: React.FC<StageComparisonProps> = ({
  image,
  beforeResult,
  afterResult,
  beforeLabel,
  afterLabel,
  settings,
  onSelectInstance,
  onClose,
  className,
}) => {
  const [sliderPos, setSliderPos] = useState<number>(50) // percentage 0..100
  const [mode, setMode] = useState<'slider' | 'side-by-side'>('slider')

  return (
    <div
      className={cn(
        'w-full bg-white rounded-xl border border-[#E5E7EB] shadow-xs flex flex-col overflow-hidden',
        className
      )}
      aria-label="Pipeline Stage Comparison View"
      data-testid="stage-comparison-view"
    >
      {/* Comparison Top Bar */}
      <div className="px-4 py-3 border-b border-[#E5E7EB] bg-[#FAFAFA] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[#111827]">
            Stage Comparison:
          </span>
          <span className="font-mono text-[#1D4ED8] bg-[#EFF6FF] px-2 py-0.5 rounded border border-[#BFDBFE]">
            {beforeLabel}
          </span>
          <span className="text-[#9CA3AF]">vs</span>
          <span className="font-mono text-[#15803D] bg-[#F0FDF4] px-2 py-0.5 rounded border border-[#BBF7D0]">
            {afterLabel}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border border-[#E5E7EB] bg-white p-0.5 text-[11px] font-mono">
            <button
              type="button"
              onClick={() => setMode('slider')}
              className={cn(
                'px-2 py-0.5 rounded transition-colors cursor-pointer',
                mode === 'slider' ? 'bg-[#111827] text-white' : 'text-[#6B7280] hover:bg-[#F3F4F6]'
              )}
            >
              Split View
            </button>
            <button
              type="button"
              onClick={() => setMode('side-by-side')}
              className={cn(
                'px-2 py-0.5 rounded transition-colors cursor-pointer',
                mode === 'side-by-side' ? 'bg-[#111827] text-white' : 'text-[#6B7280] hover:bg-[#F3F4F6]'
              )}
            >
              Side by Side
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-[#6B7280] hover:text-[#111827] p-1 text-xs cursor-pointer"
            title="Exit comparison"
          >
            ✕ Close
          </button>
        </div>
      </div>

      {/* Comparison Stage Display */}
      {mode === 'slider' ? (
        <div className="relative w-full bg-[#F3F4F6]/50 p-4 sm:p-6 flex flex-col items-center justify-center min-h-[420px]">
          {/* Outer Frame */}
          <div className="relative max-w-full max-h-[540px] select-none">
            <img
              src={image.previewUrl}
              alt={image.name}
              className="max-h-[520px] max-w-full w-auto h-auto object-contain rounded-md shadow-xs border border-[#E5E7EB] bg-white pointer-events-none"
            />

            {/* Left/Before Overlay (Clipped to slider percentage) */}
            <div
              className="absolute inset-0 overflow-hidden pointer-events-none"
              style={{ clipPath: `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)` }}
            >
              <MaskOverlay
                instances={beforeResult.instances}
                imageWidth={image.width}
                imageHeight={image.height}
                settings={settings}
                onSelectInstance={onSelectInstance}
              />
              <span className="absolute top-2 left-2 bg-[#111827]/80 backdrop-blur-xs text-white text-[10px] font-mono px-2 py-0.5 rounded border border-white/20">
                {beforeLabel} (Before)
              </span>
            </div>

            {/* Right/After Overlay (Clipped to remainder) */}
            <div
              className="absolute inset-0 overflow-hidden pointer-events-none"
              style={{ clipPath: `polygon(${sliderPos}% 0, 100% 0, 100% 100%, ${sliderPos}% 100%)` }}
            >
              <MaskOverlay
                instances={afterResult.instances}
                imageWidth={image.width}
                imageHeight={image.height}
                settings={settings}
                onSelectInstance={onSelectInstance}
              />
              <span className="absolute top-2 right-2 bg-[#1D4ED8]/85 backdrop-blur-xs text-white text-[10px] font-mono px-2 py-0.5 rounded border border-white/20">
                {afterLabel} (After)
              </span>
            </div>

            {/* Vertical Divider Line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white shadow-md pointer-events-none"
              style={{ left: `${sliderPos}%` }}
            >
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-white border border-[#D1D5DB] shadow-md flex items-center justify-center text-[10px] text-[#4B5563]">
                ↔
              </div>
            </div>
          </div>

          {/* Interactive Slider Slider Controller */}
          <div className="w-full max-w-sm mt-4 flex items-center gap-3 text-xs text-[#6B7280]">
            <span className="font-mono text-[11px]">{beforeLabel}</span>
            <input
              type="range"
              min="0"
              max="100"
              value={sliderPos}
              onChange={(e) => setSliderPos(Number(e.target.value))}
              className="flex-1 cursor-ew-resize accent-[#2563EB]"
              aria-label="Comparison slider position"
            />
            <span className="font-mono text-[11px]">{afterLabel}</span>
          </div>
        </div>
      ) : (
        /* Side by Side Mode */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 sm:p-6 bg-[#F3F4F6]/50">
          {/* Before Column */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-mono font-medium text-[#111827] bg-white px-2.5 py-1 rounded border border-[#E5E7EB] shadow-2xs">
              {beforeLabel}
            </span>
            <div className="relative max-w-full">
              <img
                src={image.previewUrl}
                alt={image.name}
                className="max-h-[380px] max-w-full w-auto h-auto object-contain rounded-md border border-[#E5E7EB] bg-white"
              />
              <MaskOverlay
                instances={beforeResult.instances}
                imageWidth={image.width}
                imageHeight={image.height}
                settings={settings}
                onSelectInstance={onSelectInstance}
              />
            </div>
          </div>

          {/* After Column */}
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs font-mono font-medium text-[#1D4ED8] bg-[#EFF6FF] px-2.5 py-1 rounded border border-[#BFDBFE] shadow-2xs">
              {afterLabel}
            </span>
            <div className="relative max-w-full">
              <img
                src={image.previewUrl}
                alt={image.name}
                className="max-h-[380px] max-w-full w-auto h-auto object-contain rounded-md border border-[#E5E7EB] bg-white"
              />
              <MaskOverlay
                instances={afterResult.instances}
                imageWidth={image.width}
                imageHeight={image.height}
                settings={settings}
                onSelectInstance={onSelectInstance}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
