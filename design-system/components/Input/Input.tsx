import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../utils'

const inputVariants = cva(
  [
    'w-full',
    'bg-white',
    'text-summit-forest',
    'placeholder:text-text-muted',
    'border border-gray-200',
    'transition-all duration-normal ease-out',
    'focus:outline-none focus:border-summit-emerald focus:ring-2 focus:ring-summit-emerald/40',
    'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50',
  ],
  {
    variants: {
      size: {
        sm: 'h-8 px-3 text-sm rounded-md',
        md: 'h-10 px-4 text-sm rounded-lg',
        lg: 'h-12 px-4 text-base rounded-lg',
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

const textareaVariants = cva(
  [
    'w-full',
    'bg-white',
    'text-summit-forest',
    'placeholder:text-text-muted',
    'border border-gray-200',
    'transition-all duration-normal ease-out',
    'focus:outline-none focus:border-summit-emerald focus:ring-2 focus:ring-summit-emerald/40',
    'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-50',
    'resize-none',
  ],
  {
    variants: {
      size: {
        sm: 'p-3 text-sm rounded-md',
        md: 'p-4 text-sm rounded-lg',
        lg: 'p-4 text-base rounded-lg',
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

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  /** Label text */
  label?: string
  /** Helper text below the input */
  helperText?: string
  /** Error message (also sets error state) */
  errorMessage?: string
  /** Icon to display on the left */
  leftIcon?: React.ReactNode
  /** Icon to display on the right */
  rightIcon?: React.ReactNode
}

export interface TextareaProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'size'>,
    VariantProps<typeof textareaVariants> {
  /** Label text */
  label?: string
  /** Helper text below the textarea */
  helperText?: string
  /** Error message (also sets error state) */
  errorMessage?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      size,
      state,
      label,
      helperText,
      errorMessage,
      leftIcon,
      rightIcon,
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || React.useId()
    const helperId = `${inputId}-helper`
    const errorId = `${inputId}-error`
    const effectiveState = errorMessage ? 'error' : state

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="mb-1.5 block text-sm font-medium text-summit-forest"
          >
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              inputVariants({ size, state: effectiveState }),
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              className
            )}
            aria-invalid={effectiveState === 'error'}
            aria-describedby={
              errorMessage ? errorId : helperText ? helperId : undefined
            }
            {...props}
          />
          {rightIcon && (
            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-muted">
              {rightIcon}
            </div>
          )}
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

Input.displayName = 'Input'

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    { className, size, state, label, helperText, errorMessage, id, rows = 4, ...props },
    ref
  ) => {
    const textareaId = id || React.useId()
    const helperId = `${textareaId}-helper`
    const errorId = `${textareaId}-error`
    const effectiveState = errorMessage ? 'error' : state

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="mb-1.5 block text-sm font-medium text-summit-forest"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          rows={rows}
          className={cn(textareaVariants({ size, state: effectiveState }), className)}
          aria-invalid={effectiveState === 'error'}
          aria-describedby={
            errorMessage ? errorId : helperText ? helperId : undefined
          }
          {...props}
        />
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

Textarea.displayName = 'Textarea'

export { Input, Textarea, inputVariants, textareaVariants }
