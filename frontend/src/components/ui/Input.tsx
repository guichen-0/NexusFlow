import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: string
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, icon, iconPosition = 'left', ...props }, ref) => {
    return (
      <div className="relative">
        {icon && iconPosition === 'left' && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full px-4 py-2.5 bg-surface-2 border border-border rounded-lg text-sm text-text-primary',
            'placeholder:text-text-muted transition-colors duration-200',
            'focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-danger focus:border-danger focus:ring-danger/20',
            icon && iconPosition === 'left' && 'pl-10',
            icon && iconPosition === 'right' && 'pr-10',
            className
          )}
          {...props}
        />
        {icon && iconPosition === 'right' && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
            {icon}
          </div>
        )}
        {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
      </div>
    )
  }
)

Input.displayName = 'Input'

// Textarea variant
interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: string
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <div>
        <textarea
          ref={ref}
          className={cn(
            'w-full px-4 py-3 bg-surface-2 border border-border rounded-lg text-sm text-text-primary',
            'placeholder:text-text-muted transition-colors duration-200 resize-none',
            'focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-danger focus:border-danger focus:ring-danger/20',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'

// Select variant
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: string
  options: { value: string; label: string }[]
  placeholder?: string
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, error, options, placeholder, ...props }, ref) => {
    return (
      <div>
        <select
          ref={ref}
          className={cn(
            'w-full px-4 py-2.5 bg-surface-2 border border-border rounded-lg text-sm text-text-primary',
            'transition-colors duration-200 cursor-pointer',
            'focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            error && 'border-danger focus:border-danger focus:ring-danger/20',
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1.5 text-xs text-danger">{error}</p>}
      </div>
    )
  }
)

Select.displayName = 'Select'

export { Input, Textarea, Select }
