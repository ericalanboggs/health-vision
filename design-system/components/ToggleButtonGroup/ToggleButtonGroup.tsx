import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../utils'

const toggleButtonGroupVariants = cva(
  'inline-flex rounded-lg bg-white border border-gray-200 p-1',
  {
    variants: {
      size: {
        sm: 'text-sm',
        md: 'text-base',
        lg: 'text-lg',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
)

const toggleButtonVariants = cva(
  [
    'inline-flex items-center justify-center font-medium transition-all duration-200 ease-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-summit-emerald focus-visible:ring-offset-1',
    'disabled:pointer-events-none disabled:opacity-50',
    'cursor-pointer',
  ],
  {
    variants: {
      size: {
        sm: 'h-8 px-3 text-sm rounded-md',
        md: 'h-10 px-4 text-sm rounded-lg',
        lg: 'h-12 px-6 text-base rounded-lg',
      },
      selected: {
        true: 'bg-summit-emerald text-white shadow-sm',
        false: 'bg-transparent text-stone-600 hover:bg-summit-mint',
      },
      fullWidth: {
        true: 'flex-1',
      },
    },
    defaultVariants: {
      size: 'md',
      selected: false,
    },
  }
)

export interface ToggleButtonOption {
  value: string
  label: React.ReactNode
  disabled?: boolean
}

export interface ToggleButtonGroupProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'>,
    VariantProps<typeof toggleButtonGroupVariants> {
  /** Array of button options */
  options: ToggleButtonOption[]
  /** Currently selected value */
  value?: string
  /** Callback when selection changes */
  onChange?: (value: string) => void
  /** Name for the radio group */
  name?: string
  /** Make buttons full width */
  fullWidth?: boolean
}

const ToggleButtonGroup = React.forwardRef<HTMLDivElement, ToggleButtonGroupProps>(
  (
    {
      className,
      options,
      value,
      onChange,
      name = 'toggle-button-group',
      size,
      fullWidth,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        role="radiogroup"
        className={cn(toggleButtonGroupVariants({ size, fullWidth }), className)}
        {...props}
      >
        {options.map((option) => {
          const isSelected = value === option.value
          const isDisabled = option.disabled

          return (
            <label
              key={option.value}
              className={cn(
                toggleButtonVariants({
                  size,
                  selected: isSelected,
                  fullWidth,
                }),
                isDisabled && 'cursor-not-allowed'
              )}
            >
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={isSelected}
                disabled={isDisabled}
                onChange={(e) => onChange?.(e.target.value)}
                className="sr-only"
              />
              {option.label}
            </label>
          )
        })}
      </div>
    )
  }
)

ToggleButtonGroup.displayName = 'ToggleButtonGroup'

export { ToggleButtonGroup, toggleButtonGroupVariants, toggleButtonVariants }
