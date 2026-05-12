import { cn } from '../../lib/utils'

interface ProgressBarProps {
  value: number
  animated?: boolean
  showLabel?: boolean
  size?: 'sm' | 'md' | 'lg'
  className?: string
  trackClassName?: string
  barClassName?: string
}

const sizeClasses = {
  sm: 'h-1',
  md: 'h-2',
  lg: 'h-3',
}

export function ProgressBar({
  value,
  animated = true,
  showLabel = false,
  size = 'md',
  className,
  trackClassName,
  barClassName,
}: ProgressBarProps) {
  const clampedValue = Math.min(100, Math.max(0, value))

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        className={cn(
          'flex-1 bg-surface-2 rounded-full overflow-hidden',
          sizeClasses[size],
          trackClassName
        )}
      >
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500 ease-out',
            animated && clampedValue < 100 && 'animate-pulse',
            barClassName,
            // Gradient by default
            !barClassName && 'bg-gradient-to-r from-primary to-accent'
          )}
          style={{ width: `${clampedValue}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-text-muted font-mono w-10 text-right">{clampedValue}%</span>
      )}
    </div>
  )
}

// Circular progress variant
interface CircularProgressProps {
  value: number
  size?: number
  strokeWidth?: number
  showLabel?: boolean
  className?: string
}

export function CircularProgress({
  value,
  size = 48,
  strokeWidth = 4,
  showLabel = true,
  className,
}: CircularProgressProps) {
  const clampedValue = Math.min(100, Math.max(0, value))
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (clampedValue / 100) * circumference

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-surface-2"
        />
        {/* Progress */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="url(#gradient)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500"
        />
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--color-primary)" />
            <stop offset="100%" stopColor="var(--color-accent)" />
          </linearGradient>
        </defs>
      </svg>
      {showLabel && (
        <span className="absolute text-xs font-medium text-text-primary">
          {clampedValue}%
        </span>
      )}
    </div>
  )
}

// Step progress variant
interface StepProgressProps {
  steps: string[]
  currentStep: number
  className?: string
}

export function StepProgress({ steps, currentStep, className }: StepProgressProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {steps.map((step, index) => {
        const isCompleted = index < currentStep
        const isCurrent = index === currentStep
        const isLast = index === steps.length - 1

        return (
          <div key={index} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors',
                  isCompleted && 'bg-success text-white',
                  isCurrent && 'bg-primary text-white animate-pulse',
                  !isCompleted && !isCurrent && 'bg-surface-2 text-text-muted'
                )}
              >
                {isCompleted ? '✓' : index + 1}
              </div>
              <span
                className={cn(
                  'text-sm',
                  isCompleted && 'text-success',
                  isCurrent && 'text-text-primary font-medium',
                  !isCompleted && !isCurrent && 'text-text-muted'
                )}
              >
                {step}
              </span>
            </div>
            {!isLast && (
              <div
                className={cn(
                  'w-8 h-0.5',
                  isCompleted ? 'bg-success' : 'bg-border'
                )}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
