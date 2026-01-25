import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../utils'
import { X } from 'lucide-react'

const tagVariants = cva(
  [
    'inline-flex items-center gap-1.5',
    'font-medium',
    'transition-colors duration-normal',
  ],
  {
    variants: {
      variant: {
        default: 'bg-summit-sage text-summit-forest',
        primary: 'bg-summit-emerald text-white',
        secondary: 'bg-summit-mint text-summit-moss border border-summit-sage',
        success: 'bg-feedback-success-light text-emerald-700',
        warning: 'bg-feedback-warning-light text-amber-700',
        error: 'bg-feedback-error-light text-red-700',
        info: 'bg-feedback-info-light text-blue-700',
        outline: 'bg-transparent text-summit-forest border border-summit-sage',
      },
      size: {
        sm: 'px-2 py-0.5 text-xs rounded-md',
        md: 'px-3 py-1 text-sm rounded-lg',
        lg: 'px-4 py-1.5 text-sm rounded-lg',
      },
      shape: {
        default: '',
        pill: 'rounded-full',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      shape: 'pill',
    },
  }
)

export interface TagProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof tagVariants> {
  /** Icon to show before the label */
  icon?: React.ReactNode
  /** Show a remove button */
  removable?: boolean
  /** Callback when remove button is clicked */
  onRemove?: () => void
}

const Tag = React.forwardRef<HTMLSpanElement, TagProps>(
  (
    {
      className,
      variant,
      size,
      shape,
      icon,
      removable,
      onRemove,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <span
        ref={ref}
        className={cn(tagVariants({ variant, size, shape }), className)}
        {...props}
      >
        {icon && <span className="flex-shrink-0">{icon}</span>}
        {children}
        {removable && (
          <button
            type="button"
            onClick={onRemove}
            className={cn(
              'flex-shrink-0 rounded-full p-0.5 transition-colors',
              'hover:bg-black/10 focus:outline-none focus:ring-1 focus:ring-current',
              size === 'sm' && '-mr-0.5',
              size === 'md' && '-mr-1',
              size === 'lg' && '-mr-1.5'
            )}
            aria-label="Remove"
          >
            <X
              className={cn(
                size === 'sm' && 'h-3 w-3',
                size === 'md' && 'h-3.5 w-3.5',
                size === 'lg' && 'h-4 w-4'
              )}
            />
          </button>
        )}
      </span>
    )
  }
)

Tag.displayName = 'Tag'

// Badge is an alias for Tag with different defaults
const badgeVariants = cva(
  [
    'inline-flex items-center justify-center',
    'font-semibold',
    'rounded-full',
  ],
  {
    variants: {
      variant: {
        default: 'bg-summit-sage text-summit-forest',
        primary: 'bg-summit-emerald text-white',
        success: 'bg-feedback-success text-white',
        warning: 'bg-feedback-warning text-white',
        error: 'bg-feedback-error text-white',
        info: 'bg-feedback-info text-white',
      },
      size: {
        sm: 'h-5 min-w-5 px-1.5 text-xs',
        md: 'h-6 min-w-6 px-2 text-xs',
        lg: 'h-7 min-w-7 px-2.5 text-sm',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant, size }), className)}
        {...props}
      >
        {children}
      </span>
    )
  }
)

Badge.displayName = 'Badge'

export { Tag, Badge, tagVariants, badgeVariants }
