import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../utils'
import { Check } from 'lucide-react'

const checkboxVariants = cva(
  [
    'relative inline-flex items-center justify-center',
    'border-2 border-summit-sage',
    'bg-white',
    'transition-colors duration-medium ease-out',
    'cursor-pointer',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-summit-emerald focus-visible:ring-offset-2',
    'disabled:cursor-not-allowed disabled:opacity-50',
  ],
  {
    variants: {
      size: {
        sm: 'h-6 w-6 min-h-6 min-w-6',
        md: 'h-8 w-8 min-h-8 min-w-8',
        lg: 'h-10 w-10 min-h-10 min-w-10',
      },
      shape: {
        circle: 'rounded-full',
        rounded: 'rounded-lg',
        square: 'rounded',
      },
    },
    defaultVariants: {
      size: 'md',
      shape: 'circle',
    },
  }
)

const checkIconVariants = cva('text-white transition-all duration-medium', {
  variants: {
    size: {
      sm: 'h-3.5 w-3.5',
      md: 'h-5 w-5',
      lg: 'h-6 w-6',
    },
  },
  defaultVariants: {
    size: 'md',
  },
})

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'>,
    VariantProps<typeof checkboxVariants> {
  /** Label text displayed next to checkbox */
  label?: string
  /** Description text below the label */
  description?: string
  /** Whether the checkbox is in an indeterminate state */
  indeterminate?: boolean
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  (
    {
      className,
      size,
      shape,
      label,
      description,
      indeterminate,
      checked,
      defaultChecked,
      disabled,
      id,
      onChange,
      ...props
    },
    ref
  ) => {
    const checkboxId = id || React.useId()
    const [isChecked, setIsChecked] = React.useState(defaultChecked || false)
    const [isAnimating, setIsAnimating] = React.useState(false)

    // Use controlled value if provided
    const checkedState = checked !== undefined ? checked : isChecked

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (checked === undefined) {
        setIsChecked(e.target.checked)
      }

      // Trigger pop animation
      if (e.target.checked) {
        setIsAnimating(true)
        setTimeout(() => setIsAnimating(false), 200)
      }

      onChange?.(e)
    }

    const hasLabelContent = label || description

    return (
      <div className={cn('flex items-center', hasLabelContent && 'gap-3', className)}>
        <div className="relative flex-shrink-0 flex items-center justify-center">
          <input
            ref={ref}
            type="checkbox"
            id={checkboxId}
            checked={checkedState}
            disabled={disabled}
            onChange={handleChange}
            className="sr-only"
            aria-checked={indeterminate ? 'mixed' : checkedState}
            {...props}
          />
          <label
            htmlFor={checkboxId}
            className={cn(
              checkboxVariants({ size, shape }),
              checkedState && [
                'bg-summit-emerald border-summit-emerald',
                isAnimating && 'animate-checkbox-pop',
              ],
              !checkedState && 'hover:border-summit-moss hover:bg-summit-mint',
              disabled && 'pointer-events-none'
            )}
          >
            {checkedState && !indeterminate && (
              <Check
                className={cn(
                  checkIconVariants({ size }),
                  'stroke-[3]'
                )}
                aria-hidden="true"
              />
            )}
            {indeterminate && (
              <div
                className={cn(
                  'bg-white rounded-full',
                  size === 'sm' && 'h-0.5 w-3',
                  size === 'md' && 'h-0.5 w-4',
                  size === 'lg' && 'h-1 w-5'
                )}
                aria-hidden="true"
              />
            )}
          </label>
        </div>
        {(label || description) && (
          <div className="flex flex-col">
            {label && (
              <label
                htmlFor={checkboxId}
                className={cn(
                  'text-summit-forest cursor-pointer select-none',
                  size === 'sm' && 'text-sm',
                  size === 'md' && 'text-base',
                  size === 'lg' && 'text-lg',
                  checkedState && 'line-through opacity-50',
                  disabled && 'cursor-not-allowed opacity-50'
                )}
              >
                {label}
              </label>
            )}
            {description && (
              <span
                className={cn(
                  'text-text-muted',
                  size === 'sm' && 'text-xs',
                  size === 'md' && 'text-sm',
                  size === 'lg' && 'text-base'
                )}
              >
                {description}
              </span>
            )}
          </div>
        )}
      </div>
    )
  }
)

Checkbox.displayName = 'Checkbox'

export { Checkbox, checkboxVariants }
