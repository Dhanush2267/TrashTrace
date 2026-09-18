import React from 'react'
import type { PipelineStageId } from '@/types'
import { PIPELINE_STAGES } from '@/lib/pipelineConfig'
import { cn } from '@/lib/utils'

interface PipelineNavigationProps {
  activeStage: PipelineStageId
  onSelectStage: (stageId: PipelineStageId) => void
  hasImage: boolean
  isDemoMode?: boolean
  className?: string
}

export const PipelineNavigation: React.FC<PipelineNavigationProps> = ({
  activeStage,
  onSelectStage,
  hasImage,
  isDemoMode = false,
  className,
}) => {
  return (
    <nav
      aria-label="Inference Pipeline Stages"
      className={cn(
        'w-full bg-white rounded-xl border border-[#E5E7EB] shadow-xs px-3 sm:px-4 py-2.5 overflow-x-auto',
        className,
      )}
    >
      <ol className="flex items-center min-w-max sm:min-w-0 sm:justify-between gap-1 sm:gap-2">
        {PIPELINE_STAGES.map((stage, index) => {
          const isActive = activeStage === stage.id
          const isInput = stage.id === 'input'

          // Status indicator logic
          let statusLabel: string
          let statusDot: 'green' | 'blue' | 'amber' | 'gray'

          if (isInput) {
            statusLabel = hasImage ? 'Loaded' : 'Awaiting'
            statusDot = hasImage ? 'green' : 'amber'
          } else if (isDemoMode) {
            statusLabel = 'Demo'
            statusDot = 'blue'
          } else {
            statusLabel = 'Pending'
            statusDot = 'gray'
          }

          const dotColors = {
            green: 'bg-[#16A34A]',
            blue: 'bg-[#2563EB]',
            amber: 'bg-[#D97706]',
            gray: 'bg-[#D1D5DB]',
          }

          return (
            <React.Fragment key={stage.id}>
              {index > 0 && (
                <li aria-hidden="true" className="shrink-0 text-[#D1D5DB] px-1 sm:px-1.5 select-none">
                  <svg
                    className="w-3.5 h-3.5 text-[#9CA3AF]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </li>
              )}

              <li className="flex-1 min-w-[110px] sm:min-w-0">
                <button
                  type="button"
                  onClick={() => onSelectStage(stage.id)}
                  aria-current={isActive ? 'step' : undefined}
                  data-testid={`stage-step-${stage.id}`}
                  className={cn(
                    'w-full flex flex-col items-start text-left px-3 py-2 rounded-lg transition-all duration-150 cursor-pointer',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/40 focus-visible:ring-offset-1',
                    isActive
                      ? 'bg-[#EFF6FF] border border-[#BFDBFE] text-[#1D4ED8] shadow-2xs'
                      : 'hover:bg-[#F9FAFB] border border-transparent text-[#4B5563]',
                  )}
                >
                  <div className="w-full flex items-center justify-between gap-1.5">
                    <span
                      className={cn(
                        'text-xs font-semibold tracking-tight truncate',
                        isActive ? 'text-[#1D4ED8]' : 'text-[#111827]',
                      )}
                    >
                      {stage.label}
                    </span>

                    {/* Status indicator */}
                    <div className="flex items-center gap-1 shrink-0">
                      <span
                        className={cn('w-1.5 h-1.5 rounded-full', dotColors[statusDot])}
                        aria-hidden="true"
                      />
                      <span className="text-[10px] font-mono text-[#9CA3AF]">
                        {statusLabel}
                      </span>
                    </div>
                  </div>

                  <span
                    className={cn(
                      'text-[11px] truncate w-full mt-0.5',
                      isActive ? 'text-[#3B82F6]' : 'text-[#6B7280]',
                    )}
                  >
                    {stage.subtitle}
                  </span>
                </button>
              </li>
            </React.Fragment>
          )
        })}
      </ol>
    </nav>
  )
}
