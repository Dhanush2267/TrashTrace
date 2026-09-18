import React from 'react'
import type { ClassCategoryItem } from '@/types'
import { cn } from '@/lib/utils'

interface ClassLegendProps {
  categories?: ClassCategoryItem[]
  highlightedClassId?: string | null
  onToggleClass?: (classId: string | null) => void
  className?: string
}

export const ClassLegend: React.FC<ClassLegendProps> = ({
  categories = [],
  highlightedClassId = null,
  onToggleClass,
  className,
}) => {
  const hasClasses = categories.length > 0

  return (
    <div
      className={cn(
        'w-full bg-white rounded-xl border border-[#E5E7EB] shadow-xs p-5 flex flex-col gap-3',
        className
      )}
      aria-label="Detection Class Summary and Legend"
      data-testid="class-legend-panel"
    >
      <div className="flex items-center justify-between pb-2.5 border-b border-[#E5E7EB]">
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
            <path d="M4 9h16" />
            <path d="M4 15h16" />
            <path d="M10 3L8 21" />
            <path d="M16 3l-2 18" />
          </svg>
          <h3 className="text-sm font-semibold text-[#111827] tracking-tight">
            Class Breakdown
          </h3>
        </div>
        <span className="text-[11px] font-mono text-[#6B7280]">
          {hasClasses ? `${categories.length} classes` : 'Data Ready'}
        </span>
      </div>

      {!hasClasses ? (
        <div className="py-4 text-center flex flex-col items-center justify-center gap-1.5 text-xs text-[#9CA3AF]">
          <p className="font-medium text-[#6B7280]">
            No class results available
          </p>
          <p className="text-[11px] max-w-[200px] leading-relaxed">
            Waste taxonomy labels and counts will populate dynamically from inference outputs.
          </p>
        </div>
      ) : (
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between px-2 py-1 text-[11px] font-mono text-[#9CA3AF] uppercase">
            <span>Category</span>
            <span>Count</span>
          </div>

          {categories.map((item) => {
            const isSelected = highlightedClassId === item.id

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onToggleClass?.(isSelected ? null : item.id)}
                className={cn(
                  'w-full flex items-center justify-between py-1.5 px-2 rounded-md transition-colors text-left cursor-pointer',
                  isSelected
                    ? 'bg-[#EFF6FF] text-[#1D4ED8] font-semibold border border-[#BFDBFE]'
                    : 'hover:bg-[#F9FAFB] text-[#374151] border border-transparent'
                )}
                title={`Filter to ${item.name}`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span
                    className="w-3 h-3 rounded-full shrink-0 border border-[#E5E7EB]"
                    style={{ backgroundColor: item.colorHex || '#9CA3AF' }}
                    aria-hidden="true"
                  />
                  <span className="truncate">{item.name}</span>
                </div>
                <span className="font-mono text-[#6B7280] ml-2 shrink-0">
                  {item.count !== undefined ? item.count : '—'}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
