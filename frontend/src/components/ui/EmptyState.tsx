import { type LucideIcon } from 'lucide-react'
import { cn } from '../../lib/utils'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      {/* Icon */}
      <div className="w-16 h-16 rounded-2xl bg-surface-2 border border-border flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-text-muted" />
      </div>

      {/* Text */}
      <h3 className="text-lg font-medium text-text-primary mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-text-secondary max-w-sm mb-4">{description}</p>
      )}

      {/* Action */}
      {action}
    </div>
  )
}

// Loading skeleton variant
interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse rounded-lg bg-surface-2',
        className
      )}
    />
  )
}

// Card skeleton
export function CardSkeleton() {
  return (
    <div className="glass rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="w-32 h-4" />
          <Skeleton className="w-20 h-3" />
        </div>
      </div>
      <Skeleton className="w-full h-20 rounded-lg" />
      <div className="flex gap-2">
        <Skeleton className="w-16 h-6 rounded-full" />
        <Skeleton className="w-16 h-6 rounded-full" />
      </div>
    </div>
  )
}

// Table skeleton
interface TableSkeletonProps {
  rows?: number
  columns?: number
}

export function TableSkeleton({ rows = 5, columns = 4 }: TableSkeletonProps) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-4 px-6 py-3 border-b border-border">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="w-20 h-4" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4 px-6 py-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className={colIndex === 0 ? 'w-32 h-4' : 'w-24 h-4'} />
          ))}
        </div>
      ))}
    </div>
  )
}
