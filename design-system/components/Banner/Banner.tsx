import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../utils'

const bannerVariants = cva(
  [
    'relative',
    'rounded-lg',
    'border-l-4',
    'p-4',
    'transition-all duration-normal ease-out',
  ],
  {
    variants: {
      variant: {
        default: 'bg-summit-mint border-l-summit-emerald',
        info: 'bg-sky-50 border-l-sky-500',
        warning: 'bg-amber-50 border-l-amber-500',
        success: 'bg-summit-mint border-l-summit-emerald',
        error: 'bg-red-50 border-l-red-500',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BannerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof bannerVariants> {
  /** Title text for the banner */
  title?: string
  /** Whether the banner can be dismissed */
  dismissible?: boolean
  /** Callback when banner is dismissed */
  onDismiss?: () => void
  /** Icon to display before the title */
  icon?: React.ReactNode
}

const Banner = React.forwardRef<HTMLDivElement, BannerProps>(
  (
    {
      className,
      variant,
      title,
      dismissible = false,
      onDismiss,
      icon,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(bannerVariants({ variant }), className)}
        role="alert"
        {...props}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            {title && (
              <div className="flex items-center gap-2 mb-1">
                {icon}
                <h4 className="font-semibold text-summit-forest">{title}</h4>
              </div>
            )}
            <div className="text-sm text-summit-forest">{children}</div>
          </div>
          {dismissible && (
            <button
              type="button"
              onClick={onDismiss}
              className="flex-shrink-0 p-1 rounded-md text-summit-moss hover:text-summit-forest hover:bg-summit-sage/50 transition-colors"
              aria-label="Dismiss"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    )
  }
)

Banner.displayName = 'Banner'

export { Banner, bannerVariants }
