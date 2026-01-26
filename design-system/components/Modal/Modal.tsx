import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../utils'
import { X } from 'lucide-react'

const modalOverlayVariants = cva(
  [
    'fixed inset-0 z-40',
    'transition-opacity duration-200',
  ],
  {
    variants: {
      overlay: {
        default: 'bg-black/50',
        light: 'bg-black/30',
        dark: 'bg-black/70',
        blur: 'bg-black/30 backdrop-blur-sm',
      },
    },
    defaultVariants: {
      overlay: 'default',
    },
  }
)

const modalVariants = cva(
  [
    'relative w-full',
    'rounded-2xl shadow-2xl',
    'max-h-[90vh] overflow-y-auto',
    'transition-all duration-200',
  ],
  {
    variants: {
      variant: {
        default: 'bg-white',
        gradient: [
          'bg-white',
          'bg-gradient-to-br from-white via-white to-summit-mint',
        ],
        'gradient-glow': [
          'bg-white',
          'overflow-hidden',
          'before:absolute before:inset-0 before:rounded-2xl before:z-0',
          'before:bg-gradient-to-br before:from-summit-emerald/8 before:via-white before:to-summit-mint/30',
          'before:pointer-events-none',
          '[&>*]:relative [&>*]:z-10',
        ],
        feature: [
          'bg-white',
          'bg-gradient-to-br from-summit-mint via-white to-white',
          'border border-summit-sage/50',
        ],
      },
      size: {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
        full: 'max-w-[calc(100vw-2rem)]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'lg',
    },
  }
)

export interface ModalProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof modalVariants>,
    VariantProps<typeof modalOverlayVariants> {
  /** Whether the modal is open */
  isOpen: boolean
  /** Callback when the modal should close */
  onClose: () => void
  /** Whether to show the close button */
  showCloseButton?: boolean
  /** Whether clicking the overlay closes the modal */
  closeOnOverlayClick?: boolean
}

const Modal = React.forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      className,
      variant,
      size,
      overlay,
      isOpen,
      onClose,
      showCloseButton = true,
      closeOnOverlayClick = true,
      children,
      ...props
    },
    ref
  ) => {
    // Handle escape key
    React.useEffect(() => {
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && isOpen) {
          onClose()
        }
      }
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }, [isOpen, onClose])

    // Prevent body scroll when modal is open
    React.useEffect(() => {
      if (isOpen) {
        document.body.style.overflow = 'hidden'
      } else {
        document.body.style.overflow = ''
      }
      return () => {
        document.body.style.overflow = ''
      }
    }, [isOpen])

    if (!isOpen) return null

    return (
      <>
        {/* Overlay */}
        <div
          className={cn(modalOverlayVariants({ overlay }))}
          onClick={closeOnOverlayClick ? onClose : undefined}
          aria-hidden="true"
        />

        {/* Modal Container */}
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            ref={ref}
            role="dialog"
            aria-modal="true"
            className={cn(modalVariants({ variant, size }), className)}
            onClick={(e) => e.stopPropagation()}
            {...props}
          >
            {showCloseButton && (
              <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-lg transition"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            )}
            {children}
          </div>
        </div>
      </>
    )
  }
)

Modal.displayName = 'Modal'

// Modal Header
export interface ModalHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Optional badge/label text above the title */
  badge?: string
  /** Badge color variant */
  badgeVariant?: 'default' | 'success' | 'warning' | 'info'
  /** Whether to show border below header */
  bordered?: boolean
}

const badgeVariants = {
  default: 'text-summit-emerald',
  success: 'text-summit-emerald',
  warning: 'text-amber-600',
  info: 'text-blue-600',
}

const ModalHeader = React.forwardRef<HTMLDivElement, ModalHeaderProps>(
  ({ className, badge, badgeVariant = 'default', bordered = true, children, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'relative p-6 pb-4',
        bordered && 'border-b border-stone-200',
        className
      )}
      {...props}
    >
      <div className="pr-8">
        {badge && (
          <p className={cn(
            'text-sm font-semibold uppercase tracking-wide mb-1',
            badgeVariants[badgeVariant]
          )}>
            {badge}
          </p>
        )}
        {children}
      </div>
    </div>
  )
)

ModalHeader.displayName = 'ModalHeader'

// Modal Title
const ModalTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn('text-2xl font-bold text-summit-forest', className)}
    {...props}
  />
))

ModalTitle.displayName = 'ModalTitle'

// Modal Description
const ModalDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-stone-600 mt-1', className)}
    {...props}
  />
))

ModalDescription.displayName = 'ModalDescription'

// Modal Body
const ModalBody = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('p-6 space-y-4', className)}
    {...props}
  />
))

ModalBody.displayName = 'ModalBody'

// Modal Footer
export interface ModalFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Alignment of footer content */
  align?: 'left' | 'center' | 'right' | 'between'
}

const footerAlignments = {
  left: 'justify-start',
  center: 'justify-center',
  right: 'justify-end',
  between: 'justify-between',
}

const ModalFooter = React.forwardRef<HTMLDivElement, ModalFooterProps>(
  ({ className, align = 'right', ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'flex items-center gap-3 p-6 pt-0',
        footerAlignments[align],
        className
      )}
      {...props}
    />
  )
)

ModalFooter.displayName = 'ModalFooter'

// Callout box for use inside modals
export interface ModalCalloutProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'success' | 'warning' | 'info'
}

const calloutVariants = {
  default: 'bg-summit-mint border-summit-sage',
  success: 'bg-summit-mint border-summit-emerald',
  warning: 'bg-amber-50 border-amber-200',
  info: 'bg-blue-50 border-blue-200',
}

const ModalCallout = React.forwardRef<HTMLDivElement, ModalCalloutProps>(
  ({ className, variant = 'default', ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-lg p-4 border',
        calloutVariants[variant],
        className
      )}
      {...props}
    />
  )
)

ModalCallout.displayName = 'ModalCallout'

export {
  Modal,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalBody,
  ModalFooter,
  ModalCallout,
  modalVariants,
  modalOverlayVariants,
}
