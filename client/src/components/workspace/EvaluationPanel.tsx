import React from 'react'
import type { EvaluationMetrics, PerClassApRow } from '@/types'
import { cn } from '@/lib/utils'


interface EvaluationPanelProps {
  metrics?: EvaluationMetrics
  classRows?: PerClassApRow[]
  isDemoFixture?: boolean
  className?: string
}

/** Format a metric value honestly — returns '—' if null/undefined */
function fmt(val: number | null | undefined, unit = ''): string {
  if (val === null || val === undefined) return '—'
  return `${val}${unit}`
}

export const EvaluationPanel: React.FC<EvaluationPanelProps> = ({
  metrics,
  classRows = [],
  isDemoFixture = false,
  className,
}) => {
  const hasMap = metrics?.mAp50_95 !== null && metrics?.mAp50_95 !== undefined
  const hasAnyClass = classRows.length > 0

  return (
    <div
      className={cn(
        'w-full bg-white rounded-xl border border-[#E5E7EB] shadow-xs flex flex-col',
        className,
      )}
      aria-label="Model Evaluation Metrics"
      data-testid="evaluation-panel"
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
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
          <h3 className="text-sm font-semibold text-[#111827] tracking-tight">
            Evaluation Metrics
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
          {isDemoFixture ? 'Demo Fixture' : 'Post-Review Eval'}
        </span>
      </div>

      <div className="p-5 flex flex-col gap-4">
        {/* Primary Metric: mAP50-95 */}
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#9CA3AF] mb-1.5">
            Primary Metric
          </div>
          <div
            className={cn(
              'flex items-center justify-between px-3.5 py-3 rounded-lg border',
              hasMap
                ? 'bg-[#EFF6FF] border-[#BFDBFE]'
                : 'bg-[#F9FAFB] border-[#E5E7EB]',
            )}
          >
            <div>
              <div className="text-xs font-semibold text-[#111827]">mAP50-95</div>
              <div className="text-[10px] text-[#6B7280] mt-0.5">
                Primary segmentation benchmark
              </div>
            </div>
            <div
              className={cn(
                'text-xl font-mono font-bold',
                hasMap ? 'text-[#1D4ED8]' : 'text-[#9CA3AF]',
              )}
              aria-label={hasMap ? `mAP50-95: ${fmt(metrics?.mAp50_95, '%')}` : 'mAP50-95: not available'}
            >
              {fmt(metrics?.mAp50_95, '%')}
            </div>
          </div>
        </div>

        {/* Supporting Metrics: AP50 + AP75 row */}
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#9CA3AF] mb-1.5">
            IoU Thresholds
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: 'maskAp50', label: 'Mask AP50', value: metrics?.maskAp50 },
              { key: 'ap75', label: 'AP75', value: metrics?.ap75 },
            ].map(({ key, label, value }) => (
              <div
                key={key}
                className="bg-[#F9FAFB] rounded-lg border border-[#E5E7EB] px-3 py-2.5 text-center"
              >
                <div className="text-[10px] text-[#6B7280] font-medium mb-0.5">{label}</div>
                <div className="text-sm font-mono font-semibold text-[#111827]">
                  {fmt(value, '%')}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Classification Metrics: Precision, Recall, F1 */}
        <div>
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#9CA3AF] mb-1.5">
            Classification Quality
          </div>
          <div className="border border-[#E5E7EB] rounded-lg overflow-hidden">
            {[
              { key: 'precision', label: 'Precision', value: metrics?.precision, hint: 'TP / (TP + FP)' },
              { key: 'recall', label: 'Recall', value: metrics?.recall, hint: 'TP / (TP + FN)' },
              { key: 'f1', label: 'F1 Score', value: metrics?.f1, hint: 'Harmonic mean' },
            ].map(({ key, label, value, hint }, i) => (
              <div
                key={key}
                className={cn(
                  'flex items-center justify-between px-3 py-2 text-xs',
                  i > 0 && 'border-t border-[#E5E7EB]',
                )}
              >
                <div>
                  <span className="font-medium text-[#374151]">{label}</span>
                  <span className="ml-2 text-[10px] text-[#9CA3AF] font-mono">{hint}</span>
                </div>
                <span className="font-mono font-semibold text-[#111827] tabular-nums">
                  {fmt(value, value !== null && value !== undefined ? '%' : '')}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Per-Class AP Table (when data available) */}
        {hasAnyClass && (
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#9CA3AF] mb-1.5">
              Per-Class Performance
            </div>
            <div className="border border-[#E5E7EB] rounded-lg overflow-hidden">
              <div className="grid grid-cols-3 px-3 py-1.5 bg-[#F9FAFB] border-b border-[#E5E7EB] text-[10px] font-mono uppercase text-[#9CA3AF]">
                <span>Class</span>
                <span className="text-center">Instances</span>
                <span className="text-right">AP</span>
              </div>
              {classRows.map((row, i) => (
                <div
                  key={row.id}
                  className={cn(
                    'grid grid-cols-3 px-3 py-2 text-xs items-center',
                    i > 0 && 'border-t border-[#E5E7EB]',
                  )}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: row.colorHex || '#9CA3AF' }}
                      aria-hidden="true"
                    />
                    <span className="text-[#374151] truncate">{row.name}</span>
                  </div>
                  <span className="text-center font-mono text-[#6B7280]">
                    {row.instances !== null && row.instances !== undefined ? row.instances : '—'}
                  </span>
                  <span className="text-right font-mono font-semibold text-[#111827]">
                    {row.ap !== null && row.ap !== undefined ? `${row.ap}%` : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Footer note */}
        <p className="text-[10px] text-[#9CA3AF] leading-relaxed">
          {isDemoFixture
            ? 'Showing demo fixture state. Benchmark metrics will be computed from the trained model after integration.'
            : 'Evaluation metrics populate from the trained YOLO segmentation model benchmark run.'}
        </p>
      </div>
    </div>
  )
}
