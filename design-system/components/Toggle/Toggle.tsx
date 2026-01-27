import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../utils'

const toggleVariants = cva(
  'relative inline-flex items-center rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-summit-emerald focus:ring-offset-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      size: {
        xs: 'h-[22px] w-[42px]',
        sm: 'h-5 w-9',
        md: 'h-6 w-11',
        lg: 'h-8 w-14',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
)

const toggleThumbVariants = cva(
  'inline-block rounded-full bg-white shadow-sm transition-transform duration-200 ease-in-out',
  {
    variants: {
      size: {
        xs: 'h-[18px] w-[18px]',
        sm: 'h-4 w-4',
        md: 'h-5 w-5',
        lg: 'h-6 w-6',
      },
    },
    defaultVariants: {
      size: 'md',
    },
  }
)

export interface ToggleProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'>,
    VariantProps<typeof toggleVariants> {
  checked?: boolean
  onChange?: (checked: boolean) => void
  onColor?: string
  offColor?: string
}

const Toggle = React.forwardRef<HTMLButtonElement, ToggleProps>(
  (
    {
      className,
      size,
      checked = false,
      onChange,
      disabled,
      onColor = 'bg-summit-emerald',
      offColor = 'bg-gray-300',
      ...props
    },
    ref
  ) => {
    const handleClick = () => {
      if (!disabled && onChange) {
        onChange(!checked)
      }
    }

    const getTranslateClass = () => {
      if (!checked) {
        // OFF state: equidistant from left
        switch (size) {
          case 'xs':
            return 'translate-x-0.5' // 2px padding
          case 'sm':
          case 'md':
            return 'translate-x-0.5' // 2px padding
          case 'lg':
            return 'translate-x-1' // 4px padding
          default:
            return 'translate-x-0.5'
        }
      }

      // ON state: equidistant from right
      switch (size) {
        case 'xs':
          // Container 42px, thumb 18px, padding 2px → thumb at 22px
          return 'translate-x-[22px]'
        case 'sm':
          // Container 36px, thumb 16px, padding 2px → thumb at 18px
          return 'translate-x-[18px]'
        case 'lg':
          // Container 56px, thumb 24px, padding 4px → thumb at 28px
          return 'translate-x-[28px]'
        default:
          // md: Container 44px, thumb 20px, padding 2px → thumb at 22px
          return 'translate-x-[22px]'
      }
    }

    return (
      <button
        ref={ref}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={handleClick}
        disabled={disabled}
        className={cn(
          toggleVariants({ size }),
          checked ? onColor : offColor,
          className
        )}
        {...props}
      >
        <span className="sr-only">Toggle</span>
        <span
          className={cn(
            toggleThumbVariants({ size }),
            getTranslateClass()
          )}
        />
      </button>
    )
  }
)

Toggle.displayName = 'Toggle'

export { Toggle, toggleVariants }
