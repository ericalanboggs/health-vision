import { useNavigate } from 'react-router-dom'
import { User, LogOut } from 'lucide-react'
import { signOut } from '../services/authService'

export default function TopNav() {
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <header className="bg-white border-b border-stone-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-2xl font-bold text-stone-900 hover:text-stone-700 transition"
          >
            <span>🏔️</span>
            <span>Summit</span>
          </button>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2 text-stone-700 hover:text-stone-900 hover:bg-stone-100 p-2 rounded-lg font-medium transition"
              title="Update Profile"
            >
              <User className="w-5 h-5 flex-shrink-0" />
              <span className="hidden sm:inline">Update Profile</span>
            </button>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 text-stone-700 hover:text-stone-900 hover:bg-stone-100 p-2 rounded-lg font-medium transition"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5 flex-shrink-0" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
