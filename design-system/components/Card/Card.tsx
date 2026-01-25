import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../utils'

const cardVariants = cva(
  [
    'bg-white',
    'transition-all duration-normal ease-out',
  ],
  {
    variants: {
      variant: {
        default: 'shadow-card',
        elevated: 'shadow-md hover:shadow-lg',
        outlined: 'border border-border-subtle shadow-none',
        ghost: 'bg-transparent shadow-none',
        feature: 'shadow-card bg-gradient-to-br from-white to-summit-mint/30',
      },
      padding: {
        none: 'p-0',
        sm: 'p-4',
        md: 'p-6',
        lg: 'p-8',
      },
      radius: {
        none: 'rounded-none',
        md: 'rounded-lg',
        lg: 'rounded-xl',
        xl: 'rounded-2xl',
      },
      interactive: {
        true: 'cursor-pointer hover:shadow-elevated hover:scale-[1.01] active:scale-[0.99]',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'md',
      radius: 'lg',
      interactive: false,
    },
  }
)

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  /** Render as a different element */
  as?: 'div' | 'article' | 'section'
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  (
    {
      className,
      variant,
      padding,
      radius,
      interactive,
      as: Component = 'div',
      children,
      ...props
    },
    ref
  ) => {
    return (
      <Component
        ref={ref}
        className={cn(cardVariants({ variant, padding, radius, interactive }), className)}
        {...props}
      >
        {children}
      </Component>
    )
  }
)

Card.displayName = 'Card'

// Card subcomponents for structured content
const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col gap-1.5', className)}
    {...props}
  />
))

CardHeader.displayName = 'CardHeader'

const CardTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement> & { as?: 'h1' | 'h2' | 'h3' | 'h4' }
>(({ className, as: Component = 'h3', ...props }, ref) => (
  <Component
    ref={ref}
    className={cn('text-lg font-semibold text-summit-forest', className)}
    {...props}
  />
))

CardTitle.displayName = 'CardTitle'

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-text-secondary', className)}
    {...props}
  />
))

CardDescription.displayName = 'CardDescription'

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('', className)} {...props} />
))

CardContent.displayName = 'CardContent'

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center gap-2 pt-4', className)}
    {...props}
  />
))

CardFooter.displayName = 'CardFooter'

// Feature card with illustration support
export interface FeatureCardProps extends CardProps {
  /** Illustration or image element */
  illustration?: React.ReactNode
  /** Position of the illustration */
  illustrationPosition?: 'left' | 'right' | 'top' | 'bottom'
}

const FeatureCard = React.forwardRef<HTMLDivElement, FeatureCardProps>(
  (
    {
      className,
      illustration,
      illustrationPosition = 'right',
      children,
      ...props
    },
    ref
  ) => {
    const isHorizontal = illustrationPosition === 'left' || illustrationPosition === 'right'

    return (
      <Card
        ref={ref}
        variant="feature"
        className={cn(
          isHorizontal ? 'flex items-center' : 'flex flex-col',
          illustrationPosition === 'left' && 'flex-row-reverse',
          illustrationPosition === 'top' && 'flex-col-reverse',
          className
        )}
        {...props}
      >
        <div className={cn('flex-1', isHorizontal ? 'pr-6' : 'pb-4')}>
          {children}
        </div>
        {illustration && (
          <div
            className={cn(
              'flex-shrink-0',
              isHorizontal && 'w-1/3',
              !isHorizontal && 'w-full'
            )}
          >
            {illustration}
          </div>
        )}
      </Card>
    )
  }
)

FeatureCard.displayName = 'FeatureCard'

export {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  FeatureCard,
  cardVariants,
}
