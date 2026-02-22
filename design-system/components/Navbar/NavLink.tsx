import * as React from 'react'
import { cn } from '../utils'

export interface NavLinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  /** Whether this link represents the current page */
  active?: boolean
}

const NavLink = React.forwardRef<HTMLAnchorElement, NavLinkProps>(
  ({ className, active = false, children, ...props }, ref) => {
    return (
      <a
        ref={ref}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'relative px-3 py-2 text-sm font-medium transition-colors rounded-md',
          active
            ? 'text-summit-forest font-semibold after:absolute after:bottom-0 after:left-3 after:right-3 after:h-0.5 after:bg-summit-forest after:rounded-full'
            : 'text-gray-500 hover:text-summit-forest',
          className
        )}
        {...props}
      >
        {children}
      </a>
    )
  }
)

NavLink.displayName = 'NavLink'

export { NavLink }
