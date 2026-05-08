import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'bg-surface-2 text-text-secondary border border-border',
        primary: 'bg-primary/10 text-primary border border-primary/20',
        success: 'bg-success/10 text-success border border-success/20',
        warning: 'bg-warning/10 text-warning border border-warning/20',
        danger: 'bg-danger/10 text-danger border border-danger/20',
        accent: 'bg-accent/10 text-accent border border-accent/20',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

// Status dot variant
function StatusDot({ status, className }: { status: 'success' | 'primary' | 'warning' | 'danger' | 'muted', className?: string }) {
  const colors = {
    success: 'bg-success',
    primary: 'bg-primary',
    warning: 'bg-warning',
    danger: 'bg-danger',
    muted: 'bg-text-muted',
  }
  return <span className={cn('w-2 h-2 rounded-full', colors[status], className)} />
}

export { Badge, badgeVariants, StatusDot }
