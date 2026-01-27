import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../utils'

const buttonVariants = cva(
  // Base styles - Rich Nature-Tech
  [
    'inline-flex items-center justify-center gap-2',
    'font-semibold',
    'transition-all duration-normal ease-out',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-summit-emerald focus-visible:ring-offset-2',
    'disabled:pointer-events-none disabled:opacity-50',
    'active:scale-[0.98] active:duration-fast',
  ],
  {
    variants: {
      variant: {
        primary: [
          'bg-summit-emerald text-white',
          'hover:bg-emerald-700 hover:scale-[1.02]',
          'shadow-sm hover:shadow-md',
        ],
        'branded-pop': [
          'bg-summit-lime text-summit-forest',
          'hover:bg-[#84CC16] hover:scale-[1.02]',
          'shadow-sm hover:shadow-md',
          'focus-visible:ring-summit-lime',
        ],
        secondary: [
          'bg-transparent text-summit-moss',
          'border border-summit-moss',
          'hover:bg-summit-mint hover:scale-[1.02]',
        ],
        ghost: [
          'bg-transparent text-summit-moss',
          'hover:bg-summit-sage hover:scale-[1.02]',
        ],
        danger: [
          'bg-feedback-error text-white',
          'hover:bg-red-600 hover:scale-[1.02]',
          'shadow-sm hover:shadow-md',
          'focus-visible:ring-feedback-error',
        ],
        link: [
          'bg-transparent text-summit-moss underline-offset-4',
          'hover:underline',
          'p-0 h-auto',
        ],
      },
      size: {
        sm: 'h-8 px-3 text-sm rounded-md',
        md: 'h-10 px-4 text-sm rounded-lg',
        lg: 'h-12 px-6 text-base rounded-lg',
        xl: 'h-14 px-8 text-lg rounded-xl',
        '2xl': 'h-16 px-10 text-xl rounded-xl',
        icon: 'h-10 w-10 rounded-lg',
        'icon-sm': 'h-8 w-8 rounded-md',
        'icon-lg': 'h-12 w-12 rounded-lg',
        'icon-xl': 'h-14 w-14 rounded-xl',
      },
      shape: {
        default: '',
        pill: 'rounded-full',
      },
      fullWidth: {
        true: 'w-full',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      shape: 'default',
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  /** Loading state - shows spinner and disables button */
  loading?: boolean
  /** Icon to show before the label */
  leftIcon?: React.ReactNode
  /** Icon to show after the label */
  rightIcon?: React.ReactNode
  /** Render as a child component (for composition with links) */
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      shape,
      fullWidth,
      loading,
      leftIcon,
      rightIcon,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading

    return (
      <button
        className={cn(buttonVariants({ variant, size, shape, fullWidth, className }))}
        ref={ref}
        disabled={isDisabled}
        aria-busy={loading}
        {...props}
      >
        {loading ? (
          <svg
            className="h-4 w-4 animate-spin"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        ) : (
          leftIcon
        )}
        {children}
        {!loading && rightIcon}
      </button>
    )
  }
)

Button.displayName = 'Button'

export { Button, buttonVariants }
