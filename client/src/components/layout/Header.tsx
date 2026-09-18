import React from 'react'

export const Header: React.FC = () => {
  return (
    <header className="border-b border-[#E5E7EB] bg-white sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Left: Brand & Project Identifier */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center text-[#2563EB]">
            {/* Instance segmentation grid icon */}
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M3 9h18" />
              <path d="M9 21V9" />
              <circle cx="15" cy="15" r="2" />
            </svg>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm sm:text-base tracking-tight text-[#111827]">
                TrashTrace
              </span>
            </div>
            <p className="text-xs text-[#6B7280] hidden sm:block leading-tight">
              Real-World Waste Instance Segmentation
            </p>
          </div>
        </div>

        {/* Right: Clean status indicators */}
        <div className="flex items-center gap-2.5">
          {/* Workspace active indicator */}
          <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[#E5E7EB] bg-white text-xs font-mono text-[#6B7280]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" aria-hidden="true" />
            Workspace Active
          </span>

          {/* Demo available indicator */}
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-[#BFDBFE] bg-[#EFF6FF] text-xs font-mono text-[#1D4ED8]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB]" aria-hidden="true" />
            Demo Available
          </span>
        </div>
      </div>
    </header>
  )
}
