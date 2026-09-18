import React, { useState } from 'react'
import type { PipelineStageId, DemoScenarioId } from '@/types'
import { cn } from '@/lib/utils'

interface ReviewModePanelProps {
  activeStage: PipelineStageId
  currentScenarioId: DemoScenarioId
  onSelectStage: (stage: PipelineStageId) => void
  onSelectScenario: (scenario: DemoScenarioId) => void
  className?: string
}

interface StageEntry {
  id: PipelineStageId
  label: string
  title: string
  role: string
  outcome: string
}

const PIPELINE_STORY: StageEntry[] = [
  {
    id: 'input',
    label: 'Input',
    title: 'Original Image',
    role: 'Raw optical baseline',
    outcome: 'Source image loaded into the pipeline.',
  },
  {
    id: 'yolo',
    label: 'YOLO',
    title: 'Object Detection',
    role: 'Deep learning segmentation model',
    outcome: 'Produces bounding boxes and candidate instance masks.',
  },
  {
    id: 'watershed',
    label: 'Watershed',
    title: 'Instance Separation',
    role: 'Topological distance transform',
    outcome: 'Resolves merged masks when waste items are touching.',
  },
  {
    id: 'morphology',
    label: 'Morphology',
    title: 'Mask Refinement',
    role: 'Mathematical morphology operators',
    outcome: 'Removes boundary noise and fills contour voids.',
  },
  {
    id: 'final',
    label: 'Final',
    title: 'Segmentation Output',
    role: 'Consolidated prediction layer',
    outcome: 'Production-ready instance masks with class and confidence.',
  },
]

interface ScenarioEntry {
  id: DemoScenarioId
  label: string
  summary: string
  key: string
}

const SCENARIOS: ScenarioEntry[] = [
  {
    id: 'normal',
    label: 'Normal',
    summary: 'Isolated waste items — YOLO produces accurate masks directly.',
    key: 'Input → YOLO → Final',
  },
  {
    id: 'touching',
    label: 'Touching',
    summary: 'Adjacent items merged by YOLO — Watershed separates them.',
    key: 'YOLO (merged) → Watershed → Separated',
  },
  {
    id: 'noisy',
    label: 'Noisy',
    summary: 'Jagged boundary artifacts — Morphology smooths the mask.',
    key: 'YOLO (noisy) → Morphology → Clean',
  },
  {
    id: 'difficult',
    label: 'Difficult',
    summary: 'Complex real-world scene — evaluation metrics pending.',
    key: 'Benchmarks: post-review',
  },
]

export const ReviewModePanel: React.FC<ReviewModePanelProps> = ({
  activeStage,
  currentScenarioId,
  onSelectStage,
  onSelectScenario,
  className,
}) => {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className={cn(
        'w-full bg-white rounded-xl border border-[#E5E7EB] shadow-xs overflow-hidden',
        className,
      )}
      aria-label="Review and Presentation Mode"
      data-testid="review-mode-panel"
    >
      {/* Header / Toggle */}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-[#F9FAFB] transition-colors cursor-pointer"
        aria-expanded={expanded}
      >
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
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
          <h3 className="text-sm font-semibold text-[#111827] tracking-tight">
            Review Guide
          </h3>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded border bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]">
            Presentation Mode
          </span>
        </div>
        <svg
          className={cn('w-4 h-4 text-[#9CA3AF] transition-transform duration-200', expanded && 'rotate-180')}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-[#E5E7EB] divide-y divide-[#F3F4F6]">
          {/* Pipeline walkthrough */}
          <div className="px-5 py-4">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#9CA3AF] mb-3">
              Pipeline Story
            </div>
            <ol className="space-y-2">
              {PIPELINE_STORY.map((entry, i) => {
                const isActive = activeStage === entry.id
                return (
                  <li key={entry.id} className="flex gap-3">
                    {/* Step number + connector */}
                    <div className="flex flex-col items-center shrink-0">
                      <button
                        type="button"
                        onClick={() => onSelectStage(entry.id)}
                        className={cn(
                          'w-6 h-6 rounded-full text-[10px] font-mono font-bold flex items-center justify-center border cursor-pointer transition-colors',
                          isActive
                            ? 'bg-[#2563EB] text-white border-[#2563EB]'
                            : 'bg-white text-[#6B7280] border-[#E5E7EB] hover:border-[#2563EB] hover:text-[#2563EB]',
                        )}
                        title={`Go to ${entry.label} stage`}
                      >
                        {i + 1}
                      </button>
                      {i < PIPELINE_STORY.length - 1 && (
                        <div className="w-px flex-1 bg-[#E5E7EB] mt-1 min-h-[12px]" aria-hidden="true" />
                      )}
                    </div>

                    {/* Stage info */}
                    <div className="pb-3">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span
                          className={cn(
                            'text-xs font-semibold',
                            isActive ? 'text-[#1D4ED8]' : 'text-[#111827]',
                          )}
                        >
                          {entry.label}
                        </span>
                        <span className="text-[10px] text-[#9CA3AF]">·</span>
                        <span className="text-[10px] font-mono text-[#6B7280]">{entry.role}</span>
                      </div>
                      <p className="text-[11px] text-[#6B7280] leading-relaxed">{entry.outcome}</p>
                    </div>
                  </li>
                )
              })}
            </ol>
          </div>

          {/* Scenario overview */}
          <div className="px-5 py-4">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#9CA3AF] mb-3">
              Demo Scenarios
            </div>
            <div className="space-y-2">
              {SCENARIOS.map((sc) => {
                const isActive = currentScenarioId === sc.id
                return (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => onSelectScenario(sc.id)}
                    className={cn(
                      'w-full text-left px-3 py-2.5 rounded-lg border text-xs transition-colors cursor-pointer',
                      isActive
                        ? 'bg-[#EFF6FF] border-[#BFDBFE] text-[#1D4ED8]'
                        : 'bg-[#F9FAFB] border-[#E5E7EB] text-[#374151] hover:border-[#BFDBFE]',
                    )}
                    data-testid={`review-scenario-${sc.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className={cn('font-semibold', isActive ? 'text-[#1D4ED8]' : 'text-[#111827]')}>
                          {sc.label}
                        </span>
                        <p className="text-[10px] text-[#6B7280] mt-0.5 leading-relaxed">{sc.summary}</p>
                      </div>
                      <span className="text-[9px] font-mono text-[#9CA3AF] whitespace-nowrap shrink-0 mt-0.5 bg-white px-1.5 py-0.5 rounded border border-[#E5E7EB]">
                        {sc.key}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Metrics reference */}
          <div className="px-5 py-4">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#9CA3AF] mb-2">
              Evaluation Readiness
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              {[
                { label: 'mAP50-95' },
                { label: 'Mask AP50' },
                { label: 'Precision / Recall' },
                { label: 'Inference Latency' },
              ].map(({ label }) => (
                <div
                  key={label}
                  className="flex items-center justify-between px-2.5 py-1.5 bg-[#F9FAFB] rounded border border-[#E5E7EB]"
                >
                  <span className="font-medium text-[#374151]">{label}</span>
                  <span className="font-mono text-[#9CA3AF]">—</span>
                </div>
              ))}
            </div>
            <p className="text-[9px] text-[#9CA3AF] mt-2 leading-relaxed">
              All benchmarks computed from the trained model evaluation run after integration.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
