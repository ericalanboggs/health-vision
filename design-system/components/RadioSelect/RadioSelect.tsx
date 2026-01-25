import React from 'react'
import { cn } from '../utils'

export interface RadioOption {
  value: string
  label: string
  description?: string
}

export interface RadioSelectProps {
  options: RadioOption[]
  value?: string
  onChange: (value: string) => void
  name: string
  className?: string
}

export const RadioSelect: React.FC<RadioSelectProps> = ({
  options,
  value,
  onChange,
  name,
  className,
}) => {
  return (
    <div className={cn('space-y-2', className)}>
      {options.map((option) => {
        const isSelected = value === option.value
        return (
          <label
            key={option.value}
            className={cn(
              'flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all',
              isSelected
                ? 'border-summit-emerald bg-summit-mint'
                : 'border-stone-300 hover:border-summit-sage hover:bg-stone-50'
            )}
          >
            <div
              className={cn(
                'w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all',
                isSelected
                  ? 'border-summit-emerald'
                  : 'border-stone-400'
              )}
            >
              {isSelected && (
                <div className="w-2.5 h-2.5 rounded-full bg-summit-emerald" />
              )}
            </div>
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={isSelected}
              onChange={(e) => onChange(e.target.value)}
              className="sr-only"
            />
            <div className="flex-1">
              <span className={cn(
                'font-medium',
                isSelected ? 'text-summit-forest' : 'text-stone-800'
              )}>
                {option.label}
              </span>
              {option.description && (
                <p className="text-sm text-stone-500 mt-0.5">{option.description}</p>
              )}
            </div>
          </label>
        )
      })}
    </div>
  )
}

export default RadioSelect
