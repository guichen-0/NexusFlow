import { forwardRef } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Loader2 } from 'lucide-react'
import { cn } from '../../lib/utils'

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        default:
          'bg-gradient-to-r from-primary to-accent text-white shadow-lg shadow-primary/20 hover:opacity-90 hover:shadow-primary/30 active:scale-[0.98]',
        secondary:
          'bg-surface-2 text-text-primary border border-border hover:bg-surface hover:border-primary/30 active:scale-[0.98]',
        outline:
          'border border-primary/50 text-primary hover:bg-primary/10 active:scale-[0.98]',
        ghost:
          'text-text-secondary hover:text-text-primary hover:bg-surface-2 active:scale-[0.98]',
        danger:
          'bg-danger/10 text-danger border border-danger/20 hover:bg-danger/20 active:scale-[0.98]',
      },
      size: {
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2.5 text-sm',
        lg: 'px-6 py-3 text-base',
        icon: 'p-2',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" />}
        {children}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button, buttonVariants }
