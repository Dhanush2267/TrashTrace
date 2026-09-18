import React, { type ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: React.ReactNode
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-medium shadow-xs active:bg-[#1E40AF] disabled:bg-[#E5E7EB] disabled:text-[#9CA3AF]',
  secondary:
    'bg-white hover:bg-[#F9FAFB] text-[#111827] border border-[#E5E7EB] shadow-xs active:bg-[#F3F4F6] disabled:bg-[#F9FAFB] disabled:text-[#9CA3AF] disabled:border-[#E5E7EB]',
  outline:
    'bg-transparent hover:bg-[#F3F4F6] text-[#374151] border border-[#E5E7EB] active:bg-[#E5E7EB] disabled:border-[#E5E7EB] disabled:text-[#9CA3AF]',
  ghost:
    'bg-transparent hover:bg-[#F3F4F6] text-[#4B5563] hover:text-[#111827] active:bg-[#E5E7EB] disabled:text-[#9CA3AF]',
  danger:
    'bg-white hover:bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5] hover:border-[#F87171] active:bg-[#FEE2E2] disabled:opacity-50',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-2.5 py-1.5 text-xs gap-1.5 font-medium',
  md: 'px-3.5 py-2 text-sm gap-2 font-medium',
  lg: 'px-4.5 py-2.5 text-base gap-2.5 font-medium',
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'secondary',
  size = 'md',
  icon,
  className,
  disabled,
  type = 'button',
  ...props
}) => {
  return (
    <button
      type={type}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center rounded-md tracking-tight transition-all duration-150 cursor-pointer',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white',
        'disabled:cursor-not-allowed select-none',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {icon && <span className="shrink-0 flex items-center">{icon}</span>}
      {children}
    </button>
  )
}
