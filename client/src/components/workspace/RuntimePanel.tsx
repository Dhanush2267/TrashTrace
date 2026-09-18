import React from 'react'
import type { RuntimeInfo } from '@/types'
import { cn } from '@/lib/utils'

interface RuntimePanelProps {
  info?: RuntimeInfo
  isDemoFixture?: boolean
  className?: string
}

function fmt(val: string | number | null | undefined, unit = ''): string {
  if (val === null || val === undefined || val === '') return '—'
  return `${val}${unit}`
}

export const RuntimePanel: React.FC<RuntimePanelProps> = ({
  info,
  isDemoFixture = false,
  className,
}) => {
  const rows: { label: string; value: string; hint?: string }[] = [
    {
      label: 'Inference Latency',
      value: fmt(info?.latencyMs, ' ms'),
      hint: 'End-to-end pipeline duration',
    },
    {
      label: 'Objects Detected',
      value: fmt(info?.objectsDetected),
      hint: 'Instance count',
    },
    {
      label: 'Classes Detected',
      value: fmt(info?.classesDetected),
      hint: 'Unique taxonomy labels',
    },
    {
      label: 'FPS',
      value: fmt(info?.fps),
      hint: 'Frames per second',
    },
  ]

  const modelRows: { label: string; value: string }[] = [
    { label: 'Model', value: fmt(info?.model) },
    { label: 'Version', value: fmt(info?.version) },
    { label: 'Input Size', value: fmt(info?.inputSize) },
    { label: 'Device', value: fmt(info?.device) },
    {
      label: 'Memory',
      value:
        info?.memoryMb !== null && info?.memoryMb !== undefined
          ? `${info.memoryMb} MB`
          : '—',
    },
  ]

  return (
    <div
      className={cn(
        'w-full bg-white rounded-xl border border-[#E5E7EB] shadow-xs flex flex-col',
        className,
      )}
      aria-label="Runtime and Model Information"
      data-testid="runtime-panel"
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
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <h3 className="text-sm font-semibold text-[#111827] tracking-tight">
            Runtime &amp; Model
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
          {isDemoFixture ? 'Demo Telemetry' : 'Live Telemetry'}
        </span>
      </div>

      <div className="p-5 flex flex-col gap-4">
        {/* Runtime Metrics */}
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#9CA3AF] mb-1.5">
            Inference Performance
          </div>
          <div className="grid grid-cols-2 gap-2">
            {rows.map(({ label, value, hint }) => (
              <div
                key={label}
                className="bg-[#F9FAFB] rounded-lg border border-[#E5E7EB] px-3 py-2.5"
              >
                <div className="text-[10px] text-[#6B7280] font-medium leading-tight">
                  {label}
                </div>
                {hint && (
                  <div className="text-[9px] text-[#9CA3AF] font-mono mt-0.5">{hint}</div>
                )}
                <div className="text-sm font-mono font-semibold text-[#111827] mt-1 tabular-nums">
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Model Information */}
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#9CA3AF] mb-1.5">
            Model Information
          </div>
          <div className="border border-[#E5E7EB] rounded-lg overflow-hidden">
            {modelRows.map(({ label, value }, i) => (
              <div
                key={label}
                className={cn(
                  'flex items-center justify-between px-3 py-2 text-xs',
                  i > 0 && 'border-t border-[#E5E7EB]',
                )}
              >
                <span className="text-[#6B7280] font-medium">{label}</span>
                <span
                  className="font-mono text-[#111827] font-semibold text-right max-w-[60%] truncate"
                  title={value !== '—' ? value : undefined}
                >
                  {value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Footer note */}
        <p className="text-[10px] text-[#9CA3AF] leading-relaxed">
          {isDemoFixture
            ? 'Telemetry will populate from the real inference pipeline after model integration.'
            : 'Values updated on each inference run from the connected model service.'}
        </p>
      </div>
    </div>
  )
}
