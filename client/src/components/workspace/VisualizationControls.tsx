import React from 'react'
import type { VisualizationSettings } from '@/types'
import { Button } from '@/components/common/Button'
import { cn } from '@/lib/utils'

interface VisualizationControlsProps {
  settings: VisualizationSettings
  onUpdateSettings: (updates: Partial<VisualizationSettings>) => void
  isCompareActive: boolean
  onToggleCompare: () => void
  canCompare: boolean
  className?: string
}

export const VisualizationControls: React.FC<VisualizationControlsProps> = ({
  settings,
  onUpdateSettings,
  isCompareActive,
  onToggleCompare,
  canCompare,
  className,
}) => {
  return (
    <div
      className={cn(
        'w-full bg-white rounded-xl border border-[#E5E7EB] shadow-xs px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs',
        className
      )}
      aria-label="Visualization Layer Controls"
    >
      {/* Left: Layer Toggles */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[#6B7280] font-medium mr-1 text-[11px] uppercase tracking-wider font-mono">
          Layers:
        </span>

        {/* Masks Toggle */}
        <button
          type="button"
          data-testid="toggle-masks-btn"
          onClick={() => onUpdateSettings({ showMasks: !settings.showMasks })}
          className={cn(
            'px-2.5 py-1 rounded-md font-medium border transition-colors cursor-pointer flex items-center gap-1.5',
            settings.showMasks
              ? 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]'
              : 'bg-white text-[#6B7280] border-[#E5E7EB] hover:bg-[#F9FAFB]'
          )}
        >
          <span
            className={cn(
              'w-2 h-2 rounded-full',
              settings.showMasks ? 'bg-[#2563EB]' : 'bg-[#D1D5DB]'
            )}
          />
          Masks
        </button>

        {/* Boxes Toggle */}
        <button
          type="button"
          data-testid="toggle-boxes-btn"
          onClick={() => onUpdateSettings({ showBoundingBoxes: !settings.showBoundingBoxes })}
          className={cn(
            'px-2.5 py-1 rounded-md font-medium border transition-colors cursor-pointer flex items-center gap-1.5',
            settings.showBoundingBoxes
              ? 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]'
              : 'bg-white text-[#6B7280] border-[#E5E7EB] hover:bg-[#F9FAFB]'
          )}
        >
          <span
            className={cn(
              'w-2 h-2 rounded-full',
              settings.showBoundingBoxes ? 'bg-[#2563EB]' : 'bg-[#D1D5DB]'
            )}
          />
          Boxes
        </button>

        {/* Labels Toggle */}
        <button
          type="button"
          data-testid="toggle-labels-btn"
          onClick={() => onUpdateSettings({ showLabels: !settings.showLabels })}
          className={cn(
            'px-2.5 py-1 rounded-md font-medium border transition-colors cursor-pointer flex items-center gap-1.5',
            settings.showLabels
              ? 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]'
              : 'bg-white text-[#6B7280] border-[#E5E7EB] hover:bg-[#F9FAFB]'
          )}
        >
          <span
            className={cn(
              'w-2 h-2 rounded-full',
              settings.showLabels ? 'bg-[#2563EB]' : 'bg-[#D1D5DB]'
            )}
          />
          Labels
        </button>

        <span className="text-[#E5E7EB] mx-1">|</span>

        {/* Opacity Control */}
        <div className="flex items-center gap-1.5 text-[#6B7280]">
          <span className="text-[11px] font-mono">Opacity:</span>
          {[0.2, 0.4, 0.65].map((op) => {
            const isSelected = Math.abs(settings.maskOpacity - op) < 0.05
            return (
              <button
                key={op}
                type="button"
                data-testid={`opacity-${Math.round(op * 100)}`}
                onClick={() => onUpdateSettings({ maskOpacity: op })}
                className={cn(
                  'px-1.5 py-0.5 rounded text-[11px] font-mono border transition-colors cursor-pointer',
                  isSelected
                    ? 'bg-[#111827] text-white border-[#111827]'
                    : 'bg-white text-[#6B7280] border-[#E5E7EB] hover:bg-[#F3F4F6]'
                )}
              >
                {Math.round(op * 100)}%
              </button>
            )
          })}
        </div>
      </div>

      {/* Right: Compare Stages Action */}
      <div className="flex items-center gap-2">
        <Button
          variant={isCompareActive ? 'primary' : 'outline'}
          size="sm"
          disabled={!canCompare}
          onClick={onToggleCompare}
          data-testid="toggle-compare-btn"
          icon={
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="12" y1="3" x2="12" y2="21" />
            </svg>
          }
          title={
            canCompare
              ? 'Compare current stage against upstream stage'
              : 'Comparison available on Watershed and Morphology stages'
          }
        >
          {isCompareActive ? 'Exit Split View' : 'Compare Stages'}
        </Button>
      </div>
    </div>
  )
}
