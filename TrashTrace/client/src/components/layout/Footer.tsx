import React from 'react'

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-[#E5E7EB] bg-white py-3.5 text-xs text-[#6B7280]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2 font-mono">
        <div className="flex items-center gap-2 text-center sm:text-left">
          <span className="w-2 h-2 rounded-full bg-[#16A34A] inline-block" aria-hidden="true" />
          <span className="text-[#374151]">TrashTrace Computer Vision Engine</span>
          <span className="text-[#D1D5DB]">|</span>
          <span className="text-[#6B7280]">Instance Segmentation Workspace</span>
        </div>
        <div className="flex items-center gap-3 text-[#6B7280]">
          <span>Interactive Visualization</span>
          <span className="text-[#D1D5DB]">|</span>
          <span>Pre-Review Release</span>
        </div>
      </div>
    </footer>
  )
}
