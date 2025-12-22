import { useNavigate } from 'react-router-dom'
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
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate('/profile')}
              className="text-stone-700 hover:text-stone-900 font-medium transition"
            >
              Update Profile
            </button>
            <button
              onClick={handleSignOut}
              className="text-stone-700 hover:text-stone-900 font-medium transition"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
