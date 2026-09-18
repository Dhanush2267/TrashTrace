import React from 'react'
import type { PipelineStageId } from '@/types'
import { getStageConfig } from '@/lib/pipelineConfig'
import { cn } from '@/lib/utils'

interface StageStatusProps {
  stageId: PipelineStageId
  isDemoMode?: boolean
  instanceCount?: number
  className?: string
}

export const StageStatus: React.FC<StageStatusProps> = ({
  stageId,
  isDemoMode = false,
  instanceCount = 0,
  className,
}) => {
  const config = getStageConfig(stageId)
  const isInput = stageId === 'input'

  return (
    <div
      className={cn(
        'w-full bg-white rounded-xl border border-[#E5E7EB] shadow-xs px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3',
        className
      )}
      aria-label="Current Pipeline Stage Status"
    >
      <div className="space-y-0.5">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-[#111827] tracking-tight">
            {config.title}
          </h2>
          <span className="text-xs text-[#9CA3AF]">•</span>
          <span className="text-xs font-mono text-[#6B7280]">
            Stage: {config.label}
          </span>
        </div>
        <p className="text-xs text-[#6B7280]">
          {config.description}
        </p>
      </div>

      <div className="shrink-0 flex items-center gap-2 font-mono text-xs">
        {isInput ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" aria-hidden="true" />
            Image Active
          </span>
        ) : instanceCount > 0 ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" aria-hidden="true" />
            {instanceCount} {instanceCount === 1 ? 'Instance' : 'Instances'} Visualized
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#F3F4F6] text-[#4B5563] border border-[#E5E7EB]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#9CA3AF]" aria-hidden="true" />
            {isDemoMode ? 'Awaiting Model Output' : 'No Objects Detected'}
          </span>
        )}
      </div>
    </div>
  )
}
