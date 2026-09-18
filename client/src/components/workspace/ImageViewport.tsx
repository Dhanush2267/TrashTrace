import React from 'react'
import type { ImageFileMetadata } from '@/types'
import { cn } from '@/lib/utils'

interface ImageViewportProps {
  image: ImageFileMetadata
  className?: string
  children?: React.ReactNode // Future segmentation overlay slot
}

export const ImageViewport: React.FC<ImageViewportProps> = ({
  image,
  className,
  children,
}) => {
  return (
    <div
      className={cn(
        'w-full flex-1 min-h-[440px] sm:min-h-[520px] bg-white rounded-xl border border-[#E5E7EB] shadow-xs flex flex-col overflow-hidden',
        className
      )}
      aria-label="Detection Image Viewport"
    >
      {/* Viewport Header Bar */}
      <div className="px-4 py-2.5 border-b border-[#E5E7EB] bg-[#FAFAFA] flex items-center justify-between text-xs text-[#6B7280]">
        <div className="flex items-center gap-2 font-mono">
          <span className="w-2 h-2 rounded-full bg-[#16A34A]" aria-hidden="true" />
          <span className="font-medium text-[#111827] truncate max-w-[220px] sm:max-w-md">
            {image.name}
          </span>
          <span className="text-[#D1D5DB]">•</span>
          <span>{image.width} × {image.height} px</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded bg-white text-[#4B5563] border border-[#E5E7EB] text-[11px] font-mono">
            {image.aspectRatio > 1.05 ? 'Landscape' : image.aspectRatio < 0.95 ? 'Portrait' : 'Square'} ({image.aspectRatio.toFixed(2)})
          </span>
        </div>
      </div>

      {/* Main Viewport Stage */}
      <div className="relative flex-1 w-full bg-[#F3F4F6]/50 p-4 sm:p-6 flex items-center justify-center overflow-auto min-h-[360px]">
        {/* Aspect Ratio Preserved Image Frame */}
        <div className="relative max-w-full max-h-[580px] flex items-center justify-center">
          <img
            src={image.previewUrl}
            alt={`Uploaded sample: ${image.name}`}
            className="max-h-[560px] max-w-full w-auto h-auto object-contain rounded-md shadow-xs border border-[#E5E7EB] bg-white select-none"
          />

          {/* Architectural Slot for Future Segmentation & Bounding Box Overlays */}
          <div
            className="absolute inset-0 pointer-events-none rounded-md"
            data-testid="segmentation-overlay-slot"
            aria-label="Prepared segmentation overlay slot"
          >
            {children}
          </div>
        </div>
      </div>

      {/* Bottom Viewport Status Notice */}
      <div className="px-4 py-2 border-t border-[#E5E7EB] bg-white flex flex-wrap items-center justify-between gap-2 text-xs text-[#6B7280]">
        <div className="flex items-center gap-1.5">
          <svg
            className="w-3.5 h-3.5 text-[#9CA3AF]"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span>Viewport active · Ready for segmentation overlay layer</span>
        </div>
        <span className="text-[11px] font-mono text-[#9CA3AF]">
          100% Native Aspect
        </span>
      </div>
    </div>
  )
}
