import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../utils'

const selectVariants = cva(
  [
    'w-full',
    'bg-white',
    'text-summit-forest',
    'border border-gray-200',
    'transition-all duration-normal ease-out',
    'focus:outline-none focus:border-summit-emerald focus:ring-2 focus:ring-summit-emerald/40',
    'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50',
    'appearance-none',
    'cursor-pointer',
  ],
  {
    variants: {
      size: {
        sm: 'h-8 px-3 pr-8 text-sm rounded-md',
        md: 'h-10 px-4 pr-10 text-sm rounded-lg',
        lg: 'h-12 px-4 pr-10 text-base rounded-lg',
      },
      state: {
        default: '',
        error: [
          'border-feedback-error',
          'focus:border-feedback-error focus:ring-feedback-error/40',
        ],
        success: [
          'border-feedback-success',
          'focus:border-feedback-success focus:ring-feedback-success/40',
        ],
      },
    },
    defaultVariants: {
      size: 'md',
      state: 'default',
    },
  }
)

export interface SelectProps
  extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'size'>,
    VariantProps<typeof selectVariants> {
  /** Label text */
  label?: string
  /** Helper text below the select */
  helperText?: string
  /** Error message (also sets error state) */
  errorMessage?: string
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      size,
      state,
      label,
      helperText,
      errorMessage,
      id,
      children,
      ...props
    },
    ref
  ) => {
    const selectId = id || React.useId()
    const helperId = `${selectId}-helper`
    const errorId = `${selectId}-error`
    const effectiveState = errorMessage ? 'error' : state

    return (
      <div className={cn('w-full', className)}>
        {label && (
          <label
            htmlFor={selectId}
            className="mb-1.5 block text-sm font-medium text-summit-forest"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={selectVariants({ size, state: effectiveState })}
            aria-invalid={effectiveState === 'error'}
            aria-describedby={
              errorMessage ? errorId : helperText ? helperId : undefined
            }
            {...props}
          >
            {children}
          </select>
          {/* Dropdown arrow icon */}
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
            <svg
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>
        {errorMessage && (
          <p id={errorId} className="mt-1.5 text-sm text-feedback-error" role="alert">
            {errorMessage}
          </p>
        )}
        {helperText && !errorMessage && (
          <p id={helperId} className="mt-1.5 text-sm text-text-muted">
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Select.displayName = 'Select'

export { Select, selectVariants }
