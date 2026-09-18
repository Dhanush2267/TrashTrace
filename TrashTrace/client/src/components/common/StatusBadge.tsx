import React from 'react'
import { cn } from '@/lib/utils'

export type StatusVariant = 'neutral' | 'blue' | 'amber' | 'emerald' | 'rose'

interface StatusBadgeProps {
  label: string
  variant?: StatusVariant
  pulse?: boolean
  className?: string
}

const variantStyles: Record<StatusVariant, { badge: string; dot: string }> = {
  neutral: {
    badge: 'bg-[#F3F4F6] text-[#374151] border-[#E5E7EB]',
    dot: 'bg-[#9CA3AF]',
  },
  blue: {
    badge: 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]',
    dot: 'bg-[#2563EB]',
  },
  amber: {
    badge: 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]',
    dot: 'bg-[#D97706]',
  },
  emerald: {
    badge: 'bg-[#F0FDF4] text-[#15803D] border-[#BBF7D0]',
    dot: 'bg-[#16A34A]',
  },
  rose: {
    badge: 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]',
    dot: 'bg-[#DC2626]',
  },
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  label,
  variant = 'neutral',
  pulse = false,
  className,
}) => {
  const styles = variantStyles[variant]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium tracking-tight border',
        styles.badge,
        className
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full shrink-0',
          styles.dot,
          pulse && 'animate-pulse'
        )}
        aria-hidden="true"
      />
      <span>{label}</span>
    </span>
  )
}
