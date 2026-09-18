import React from 'react'
import type { SegmentationInstance } from '@/types'
import { Button } from '@/components/common/Button'
import { cn } from '@/lib/utils'

interface InstanceInspectorProps {
  instance: SegmentationInstance | null
  isDemoFixture?: boolean
  onClose: () => void
  className?: string
}

export const InstanceInspector: React.FC<InstanceInspectorProps> = ({
  instance,
  isDemoFixture = false,
  onClose,
  className,
}) => {
  if (!instance) return null

  const box = instance.boundingBox

  return (
    <div
      className={cn(
        'w-full bg-white rounded-xl border border-[#BFDBFE] bg-[#F0F7FF]/30 shadow-xs p-4 flex flex-col gap-3',
        className
      )}
      aria-label="Selected Instance Inspector"
      data-testid="instance-inspector"
    >
      <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-2">
          <span
            className="w-3 h-3 rounded-full shrink-0 border border-[#E5E7EB]"
            style={{ backgroundColor: instance.colorHex }}
            aria-hidden="true"
          />
          <h4 className="text-xs font-semibold text-[#111827]">
            {instance.className}
          </h4>
          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white text-[#4B5563] border border-[#E5E7EB]">
            {Math.round(instance.confidence * 100)}% Conf
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {isDemoFixture && (
            <span className="text-[10px] font-mono uppercase text-[#D97706] bg-[#FFFBEB] px-1.5 py-0.5 rounded border border-[#FDE68A]">
              Demo Data
            </span>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-6 px-1.5 text-xs text-[#6B7280] hover:text-[#111827]"
            title="Deselect instance"
          >
            ✕
          </Button>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-y-2 gap-x-3 text-[11px]">
        <div>
          <dt className="text-[#6B7280]">Instance ID</dt>
          <dd className="font-mono text-[#111827] font-medium truncate" title={instance.instanceId}>
            {instance.instanceId}
          </dd>
        </div>

        <div>
          <dt className="text-[#6B7280]">Mask State</dt>
          <dd className="font-mono text-[#111827] font-medium capitalize">
            {instance.maskStatus || 'Standard'}
          </dd>
        </div>

        <div>
          <dt className="text-[#6B7280]">Bounding Box</dt>
          <dd className="font-mono text-[#111827]">
            [{box.x.toFixed(2)}, {box.y.toFixed(2)}, {box.width.toFixed(2)}, {box.height.toFixed(2)}]
          </dd>
        </div>

        <div>
          <dt className="text-[#6B7280]">Polygon Vertices</dt>
          <dd className="font-mono text-[#111827]">
            {instance.polygon.length} points
          </dd>
        </div>
      </dl>

      {instance.notes && (
        <p className="text-[11px] text-[#4B5563] bg-white p-2 rounded border border-[#E5E7EB] leading-relaxed">
          <span className="font-medium text-[#111827]">Observation:</span> {instance.notes}
        </p>
      )}
    </div>
  )
}
