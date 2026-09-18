import React, { useRef } from 'react'
import { Button } from '@/components/common/Button'
import { isAcceptedImageType, MAX_FILE_SIZE_BYTES } from '@/lib/utils'

interface WorkspaceToolbarProps {
  onReplaceImage: (file: File) => void
  onRemoveImage: () => void
  onValidationError?: (error: string) => void
  hasImage: boolean
  activeStageLabel?: string
  className?: string
}

export const WorkspaceToolbar: React.FC<WorkspaceToolbarProps> = ({
  onReplaceImage,
  onRemoveImage,
  onValidationError,
  hasImage,
  activeStageLabel = 'Input',
  className,
}) => {
  const replaceInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    if (!isAcceptedImageType(file)) {
      onValidationError?.('Unsupported format. Please upload a JPG, PNG, or WebP image.')
      return
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      onValidationError?.('File exceeds the 25MB limit.')
      return
    }

    onReplaceImage(file)
    e.target.value = ''
  }

  if (!hasImage) return null

  return (
    <div
      className={`w-full bg-white rounded-xl border border-[#E5E7EB] shadow-xs px-4 py-3 flex flex-wrap items-center justify-between gap-3 ${className || ''}`}
      aria-label="Workspace Actions Toolbar"
    >
      <input
        ref={replaceInputRef}
        id="replace-file-input"
        data-testid="replace-file-input"
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        onChange={handleFileChange}
        className="sr-only"
        tabIndex={-1}
        aria-label="Replace current image"
      />

      {/* Left side: Context badge / state */}
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#2563EB]" aria-hidden="true" />
        <span className="text-xs font-semibold text-[#111827] tracking-tight">
          Image Loaded
        </span>
        <span className="text-[#D1D5DB]">•</span>
        <span className="text-xs font-medium text-[#4B5563]">
          Active Stage: <span className="text-[#1D4ED8]">{activeStageLabel}</span>
        </span>
      </div>

      {/* Right side: Action controls */}
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          data-testid="replace-image-button"
          onClick={() => replaceInputRef.current?.click()}
          icon={
            <svg
              className="w-3.5 h-3.5 text-[#4B5563]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
          }
        >
          Replace Image
        </Button>

        <Button
          variant="ghost"
          size="sm"
          data-testid="remove-image-button"
          onClick={onRemoveImage}
          className="text-[#DC2626] hover:bg-[#FEF2F2] hover:text-[#B91C1C]"
          icon={
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
          }
        >
          Remove
        </Button>
      </div>
    </div>
  )
}
