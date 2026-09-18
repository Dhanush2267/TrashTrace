import React from 'react'
import type { ImageFileMetadata } from '@/types'
import { cn } from '@/lib/utils'

interface ImageMetadataProps {
  image: ImageFileMetadata
  className?: string
}

export const ImageMetadata: React.FC<ImageMetadataProps> = ({
  image,
  className,
}) => {
  const formattedDate = new Date(image.lastModified).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div
      className={cn(
        'w-full bg-white rounded-xl border border-[#E5E7EB] shadow-xs p-5 flex flex-col gap-4',
        className
      )}
      aria-label="Image Metadata Specifications"
    >
      <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
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
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <h3 className="text-sm font-semibold text-[#111827] tracking-tight">
            Image Specifications
          </h3>
        </div>
        <span className="text-[11px] font-mono text-[#6B7280] bg-[#F3F4F6] px-2 py-0.5 rounded border border-[#E5E7EB]">
          Source Metadata
        </span>
      </div>

      <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-y-3.5 gap-x-6 text-xs">
        <div>
          <dt className="text-[#6B7280] font-medium">Filename</dt>
          <dd className="mt-0.5 text-[#111827] font-mono font-medium truncate" title={image.name}>
            {image.name}
          </dd>
        </div>

        <div>
          <dt className="text-[#6B7280] font-medium">Resolution</dt>
          <dd className="mt-0.5 text-[#111827] font-mono font-medium">
            {image.width} × {image.height} px
          </dd>
        </div>

        <div>
          <dt className="text-[#6B7280] font-medium">File Size</dt>
          <dd className="mt-0.5 text-[#111827] font-mono font-medium">
            {image.formattedSize}
          </dd>
        </div>

        <div>
          <dt className="text-[#6B7280] font-medium">MIME Format</dt>
          <dd className="mt-0.5 text-[#111827] font-mono font-medium uppercase">
            {image.mimeType || 'IMAGE/UNKNOWN'}
          </dd>
        </div>

        <div>
          <dt className="text-[#6B7280] font-medium">Aspect Ratio</dt>
          <dd className="mt-0.5 text-[#111827] font-mono font-medium">
            {image.aspectRatio.toFixed(3)} : 1
          </dd>
        </div>

        <div>
          <dt className="text-[#6B7280] font-medium">Last Modified</dt>
          <dd className="mt-0.5 text-[#111827] font-mono">
            {formattedDate}
          </dd>
        </div>
      </dl>
    </div>
  )
}
