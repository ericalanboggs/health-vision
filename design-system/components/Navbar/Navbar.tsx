import * as React from 'react'
import { cn } from '../utils'

export interface NavbarProps extends React.HTMLAttributes<HTMLElement> {
  /** Logo element rendered on the left */
  logo?: React.ReactNode
  /** Actions rendered on the right (profile dropdown, etc.) */
  actions?: React.ReactNode
}

const Navbar = React.forwardRef<HTMLElement, NavbarProps>(
  ({ className, logo, actions, children, ...props }, ref) => {
    return (
      <nav
        ref={ref}
        className={cn(
          'sticky top-0 z-30 w-full border-b border-gray-200 bg-white',
          className
        )}
        {...props}
      >
        <div className="mx-auto px-4 sm:px-6 lg:px-10">
          <div className="flex py-8 items-center justify-between">
            {/* Left — Logo */}
            {logo && <div className="flex-shrink-0">{logo}</div>}

            {/* Center — Nav links (hidden on mobile) */}
            <div className="hidden md:flex items-center gap-1">
              {children}
            </div>

            {/* Right — Actions */}
            {actions && <div className="flex items-center">{actions}</div>}
          </div>
        </div>
      </nav>
    )
  }
)

Navbar.displayName = 'Navbar'

export { Navbar }
