import React, { useRef, useState, useCallback } from 'react'
import { isAcceptedImageType, MAX_FILE_SIZE_BYTES, formatBytes, cn } from '@/lib/utils'

interface ImageUploaderProps {
  onImageSelected: (file: File) => void
  disabled?: boolean
  className?: string
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImageSelected,
  disabled = false,
  className,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const validateAndProcessFile = useCallback(
    (file: File) => {
      setErrorMessage(null)

      if (!isAcceptedImageType(file)) {
        setErrorMessage('Unsupported format. Please upload a JPG, PNG, or WebP image.')
        return
      }

      if (file.size > MAX_FILE_SIZE_BYTES) {
        setErrorMessage(
          `File exceeds maximum limit of ${formatBytes(MAX_FILE_SIZE_BYTES)}. File size: ${formatBytes(file.size)}.`
        )
        return
      }

      onImageSelected(file)
    },
    [onImageSelected]
  )

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) setIsDragOver(true)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    if (disabled) return

    const files = e.dataTransfer.files
    if (files && files.length > 0) {
      validateAndProcessFile(files[0])
    }
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      validateAndProcessFile(files[0])
      // Reset input value so same file can be re-selected if desired
      e.target.value = ''
    }
  }

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
      e.preventDefault()
      fileInputRef.current?.click()
    }
  }

  return (
    <div className={cn('w-full flex flex-col items-center', className)}>
      <input
        ref={fileInputRef}
        id="image-file-input"
        data-testid="image-file-input"
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        onChange={handleFileInputChange}
        className="sr-only"
        aria-label="Upload waste image"
        tabIndex={-1}
        disabled={disabled}
      />

      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        aria-label="Upload an image. Drag and drop or browse files"
        className={cn(
          'w-full min-h-[380px] sm:min-h-[440px] flex flex-col items-center justify-center p-8 sm:p-12',
          'bg-white rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer select-none',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/40 focus-visible:ring-offset-2',
          isDragOver
            ? 'border-[#2563EB] bg-[#EFF6FF]/60 shadow-sm scale-[0.998]'
            : 'border-[#E5E7EB] hover:border-[#D1D5DB] hover:bg-[#FAFAFA] shadow-xs',
          disabled && 'opacity-50 cursor-not-allowed hover:bg-white hover:border-[#E5E7EB]'
        )}
      >
        <div className="flex flex-col items-center max-w-sm text-center">
          {/* Upload Icon */}
          <div
            className={cn(
              'w-14 h-14 mb-4 rounded-xl flex items-center justify-center transition-colors duration-150',
              isDragOver ? 'bg-[#DBEAFE] text-[#2563EB]' : 'bg-[#F3F4F6] text-[#4B5563]'
            )}
          >
            <svg
              className="w-7 h-7"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
          </div>

          <h2 className="text-base sm:text-lg font-semibold text-[#111827] tracking-tight">
            Upload an image
          </h2>
          <p className="mt-1 text-sm text-[#6B7280]">
            Drag & drop or <span className="text-[#2563EB] font-medium underline underline-offset-2">browse files</span>
          </p>

          <div className="mt-4 flex items-center gap-2 text-xs font-mono text-[#9CA3AF]">
            <span>JPG</span>
            <span>•</span>
            <span>PNG</span>
            <span>•</span>
            <span>WebP</span>
            <span>•</span>
            <span>Up to 25MB</span>
          </div>
        </div>
      </div>

      {/* Validation Error Banner */}
      {errorMessage && (
        <div
          role="alert"
          className="w-full mt-3 px-4 py-2.5 rounded-lg bg-[#FEF2F2] border border-[#FECACA] flex items-center justify-between text-xs text-[#DC2626]"
        >
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 shrink-0 text-[#DC2626]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span className="font-medium">{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-[#9CA3AF] hover:text-[#111827] cursor-pointer p-0.5"
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  )
}
