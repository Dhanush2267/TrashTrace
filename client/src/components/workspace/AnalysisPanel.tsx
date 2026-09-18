import React from 'react'
import type { StageAnalysisMetrics } from '@/types'
import { cn } from '@/lib/utils'

interface AnalysisPanelProps {
  metrics?: StageAnalysisMetrics
  stageTitle?: string
  isDemoFixture?: boolean
  className?: string
}

/** Formats a metric value honestly — returns '—' if null/undefined */
function fmt(val: number | null | undefined, unit = ''): string {
  if (val === null || val === undefined) return '—'
  return `${val}${unit}`
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  metrics,
  stageTitle = 'Pipeline Stage',
  isDemoFixture = false,
  className,
}) => {
  const rows = [
    { id: 'objects', label: 'Objects Detected', value: fmt(metrics?.objectsDetected), hint: 'Segmented instance count' },
    { id: 'classes', label: 'Classes', value: fmt(metrics?.classesCount), hint: 'Unique taxonomy labels' },
    { id: 'confidence', label: 'Mean Confidence', value: fmt(metrics?.confidenceMean, '%'), hint: 'Avg. detection score' },
    { id: 'latency', label: 'Inference Latency', value: fmt(metrics?.latencyMs, ' ms'), hint: 'Pipeline duration' },
  ]

  return (
    <div
      className={cn(
        'w-full bg-white rounded-xl border border-[#E5E7EB] shadow-xs flex flex-col',
        className,
      )}
      aria-label="Stage Telemetry"
      data-testid="stage-analysis-panel"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-[#2563EB]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 3v18h18" />
            <path d="M18 17V9" />
            <path d="M13 17V5" />
            <path d="M8 17v-3" />
          </svg>
          <h3 className="text-sm font-semibold text-[#111827] tracking-tight">
            Stage Telemetry
          </h3>
        </div>
        <span
          className={cn(
            'text-[10px] font-mono px-2 py-0.5 rounded border',
            isDemoFixture
              ? 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]'
              : 'bg-[#F3F4F6] text-[#6B7280] border-[#E5E7EB]',
          )}
        >
          {isDemoFixture ? 'Demo Data' : 'Live Data'}
        </span>
      </div>

      <div className="p-5">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-xs">
          {rows.map(({ id, label, value, hint }) => (
            <div key={id}>
              <dt className="text-[#6B7280] font-medium leading-tight">{label}</dt>
              {hint && <dd className="text-[9px] text-[#9CA3AF] font-mono mb-0.5">{hint}</dd>}
              <dd
                className="mt-1 text-base font-mono font-semibold text-[#111827] tabular-nums"
                title={label}
              >
                {value}
              </dd>
            </div>
          ))}
        </dl>

        <p className="mt-4 text-[10px] text-[#9CA3AF] leading-relaxed border-t border-[#E5E7EB] pt-3">
          {isDemoFixture
            ? `Demo telemetry for ${stageTitle}. Real values will appear after model integration.`
            : `Live values from ${stageTitle} inference pipeline execution.`}
        </p>
      </div>
    </div>
  )
}
