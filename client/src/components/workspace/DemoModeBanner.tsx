import React from 'react'
import type { DemoScenarioId } from '@/types'
import { DEMO_SCENARIOS } from '@/demo/scenarios'
import { cn } from '@/lib/utils'

interface DemoModeBannerProps {
  isDemoMode: boolean
  onToggleDemoMode: () => void
  currentScenarioId: DemoScenarioId
  onSelectScenario: (id: DemoScenarioId) => void
  className?: string
}

export const DemoModeBanner: React.FC<DemoModeBannerProps> = ({
  isDemoMode,
  onToggleDemoMode,
  currentScenarioId,
  onSelectScenario,
  className,
}) => {
  const currentScenario = DEMO_SCENARIOS[currentScenarioId]

  return (
    <div
      className={cn(
        'w-full bg-white rounded-xl border border-[#E5E7EB] shadow-xs px-4 py-3 flex flex-col gap-2.5',
        className
      )}
      aria-label="Demo Mode and Scenario Selector"
    >
      {/* Top Controls Row */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Demo Mode Toggle Button */}
          <button
            type="button"
            data-testid="toggle-demo-mode-btn"
            onClick={onToggleDemoMode}
            className={cn(
              'px-2.5 py-1 rounded-md text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5',
              isDemoMode
                ? 'bg-[#1E40AF] text-white border-[#1E40AF] shadow-xs'
                : 'bg-white text-[#4B5563] border-[#E5E7EB] hover:bg-[#F9FAFB]'
            )}
          >
            <span
              className={cn(
                'w-2 h-2 rounded-full',
                isDemoMode ? 'bg-emerald-400' : 'bg-[#9CA3AF]'
              )}
            />
            Demo Mode: {isDemoMode ? 'Active' : 'Off'}
          </button>

          <span className="text-[11px] font-mono uppercase text-[#D97706] bg-[#FFFBEB] px-2 py-0.5 rounded border border-[#FDE68A]">
            Pre-Review Simulation
          </span>
        </div>

        {/* Scenario Selection Tabs */}
        {isDemoMode && (
          <div className="flex items-center gap-1.5 bg-[#F3F4F6] p-0.5 rounded-lg border border-[#E5E7EB] text-xs font-medium">
            {(['normal', 'touching', 'noisy', 'difficult'] as DemoScenarioId[]).map((id) => {
              const isSelected = currentScenarioId === id
              const scenario = DEMO_SCENARIOS[id]
              return (
                <button
                  key={id}
                  type="button"
                  data-testid={`scenario-tab-${id}`}
                  onClick={() => onSelectScenario(id)}
                  className={cn(
                    'px-2.5 py-1 rounded-md transition-all cursor-pointer select-none text-xs',
                    isSelected
                      ? 'bg-white text-[#111827] shadow-xs font-semibold border border-[#E5E7EB]'
                      : 'text-[#6B7280] hover:text-[#111827] border border-transparent'
                  )}
                >
                  {scenario.title.split(' ')[0]}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Narrative Storytelling Callout */}
      {isDemoMode && (
        <div className="bg-[#F8FAFC] rounded-lg p-2.5 border border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="space-y-0.5">
            <span className="font-semibold text-[#0F172A] mr-2">
              Scenario: {currentScenario.title}
            </span>
            <span className="text-[#64748B]">
              — {currentScenario.tagline}
            </span>
          </div>

          <span className="text-[11px] text-[#475569] bg-white px-2 py-0.5 rounded border border-[#E2E8F0] shrink-0">
            Story: {currentScenario.storyExplanation.slice(0, 75)}...
          </span>
        </div>
      )}
    </div>
  )
}
