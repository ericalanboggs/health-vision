import { useState, useEffect, useRef } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Menu, X, User, LogOut } from 'lucide-react'
import { signOut } from '../services/authService'
import { Navbar, NavLink } from '@summit/design-system'

const NAV_LINKS = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Habits', path: '/habits' },
  { label: 'Reflections', path: '/reflection' },
  { label: 'Guides', path: '/guides' },
  { label: 'Coaching', path: '/coaching' },
]

export default function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false)
  }, [location.pathname])

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  const isActive = (path) => {
    if (path === '/habits') {
      return ['/habits', '/add-habit', '/schedule-habits'].includes(location.pathname)
        || location.pathname.startsWith('/challenges')
    }
    return location.pathname === path
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-summit-mint">
      <Navbar
        logo={
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center hover:opacity-80 transition"
          >
            <img src="/summit-logo.svg" alt="Summit Health" className="h-8" />
          </button>
        }
        actions={
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex items-center justify-center w-9 h-9 rounded-full text-summit-moss hover:text-summit-forest hover:bg-summit-sage transition"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-40">
                {/* Nav links — visible in dropdown on mobile only */}
                <div className="md:hidden">
                  {NAV_LINKS.map(({ label, path }) => (
                    <button
                      key={path}
                      onClick={() => navigate(path)}
                      className={`w-full text-left px-4 py-2 text-sm font-medium transition-colors ${
                        isActive(path)
                          ? 'text-summit-forest bg-summit-mint font-semibold'
                          : 'text-gray-600 hover:text-summit-forest hover:bg-summit-mint/50'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                  <div className="border-t border-gray-200 my-1" />
                </div>
                <button
                  onClick={() => navigate('/profile')}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-summit-forest hover:bg-summit-mint transition"
                >
                  <User className="w-4 h-4" />
                  Profile
                </button>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-summit-forest hover:bg-summit-mint transition"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        }
      >
        {/* Desktop nav links (rendered as Navbar children -> centered) */}
        {NAV_LINKS.map(({ label, path }) => (
          <NavLink
            key={path}
            href={path}
            active={isActive(path)}
            onClick={(e) => { e.preventDefault(); navigate(path) }}
          >
            {label}
          </NavLink>
        ))}
      </Navbar>

      <Outlet />
    </div>
  )
}
