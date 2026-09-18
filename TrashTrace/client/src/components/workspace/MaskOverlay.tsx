import React from 'react'
import type { SegmentationInstance, VisualizationSettings } from '@/types'

interface MaskOverlayProps {
  instances: SegmentationInstance[]
  imageWidth: number
  imageHeight: number
  settings: VisualizationSettings
  onSelectInstance: (instanceId: string | null) => void
  className?: string
}

export const MaskOverlay: React.FC<MaskOverlayProps> = ({
  instances,
  imageWidth,
  imageHeight,
  settings,
  onSelectInstance,
  className,
}) => {
  if (!instances || instances.length === 0) return null

  const handleBackgroundClick = () => {
    onSelectInstance(null)
  }

  return (
    <svg
      viewBox={`0 0 ${imageWidth} ${imageHeight}`}
      preserveAspectRatio="xMidYMid meet"
      onClick={handleBackgroundClick}
      className={`absolute inset-0 w-full h-full pointer-events-auto cursor-default ${className || ''}`}
      aria-label="Segmentation Mask and Bounding Box Overlay"
    >
      <defs>
        {/* Glow filter for selected instances */}
        <filter id="selection-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor="#2563EB" floodOpacity="0.8" />
        </filter>
      </defs>

      {instances.map((instance) => {
        const isSelected = settings.selectedInstanceId === instance.instanceId
        const isHighlighted =
          settings.highlightedClassId === null || settings.highlightedClassId === instance.classId
        const effectiveOpacity = isSelected ? Math.min(settings.maskOpacity + 0.25, 0.9) : settings.maskOpacity

        // Convert normalized polygon points (0..1) to native image coordinates
        const pointsStr = instance.polygon
          .map(([nx, ny]) => `${nx * imageWidth},${ny * imageHeight}`)
          .join(' ')

        // Convert normalized bounding box (0..1) to native image coordinates
        const bx = instance.boundingBox.x * imageWidth
        const by = instance.boundingBox.y * imageHeight
        const bw = instance.boundingBox.width * imageWidth
        const bh = instance.boundingBox.height * imageHeight

        // Label position
        const labelY = by > 24 ? by - 6 : by + 18

        return (
          <g
            key={instance.instanceId}
            data-testid={`instance-group-${instance.instanceId}`}
            onClick={(e) => {
              e.stopPropagation()
              onSelectInstance(isSelected ? null : instance.instanceId)
            }}
            className={`cursor-pointer transition-opacity duration-150 ${
              isHighlighted ? 'opacity-100' : 'opacity-25'
            }`}
          >
            {/* 1. Segmentation Polygon Mask */}
            {settings.showMasks && (
              <polygon
                points={pointsStr}
                fill={instance.colorHex}
                fillOpacity={effectiveOpacity}
                stroke={instance.colorHex}
                strokeWidth={isSelected ? 3.5 : 2}
                strokeLinejoin="round"
                filter={isSelected ? 'url(#selection-glow)' : undefined}
                className="transition-all duration-150 hover:fill-opacity-50"
              />
            )}

            {/* 2. Bounding Box */}
            {settings.showBoundingBoxes && (
              <rect
                x={bx}
                y={by}
                width={bw}
                height={bh}
                fill="none"
                stroke={instance.colorHex}
                strokeWidth={isSelected ? 2.5 : 1.75}
                strokeDasharray={instance.maskStatus === 'merged' ? '4 2' : undefined}
                rx="3"
                filter={isSelected ? 'url(#selection-glow)' : undefined}
              />
            )}

            {/* 3. Class & Confidence Label Badge */}
            {settings.showLabels && (
              <g transform={`translate(${bx}, ${labelY})`}>
                {/* Background badge pill */}
                <rect
                  x="0"
                  y="-14"
                  width={instance.className.length * 7.5 + 46}
                  height="18"
                  rx="3"
                  fill="#111827"
                  fillOpacity="0.88"
                  stroke={instance.colorHex}
                  strokeWidth="1"
                />
                {/* Text: Class Name + Confidence */}
                <text
                  x="6"
                  y="-2"
                  fill="#FFFFFF"
                  fontSize="10"
                  fontFamily="monospace"
                  fontWeight="600"
                  letterSpacing="0.02em"
                  className="select-none"
                >
                  {instance.className} {Math.round(instance.confidence * 100)}%
                </text>
              </g>
            )}
          </g>
        )
      })}
    </svg>
  )
}
