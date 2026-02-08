import { useNavigate } from 'react-router-dom'
import { Person, Logout } from '@mui/icons-material'
import { signOut } from '../services/authService'

export default function TopNav() {
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <header className="bg-transparent">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center hover:opacity-80 transition"
          >
            <img src="/summit-logo.svg" alt="Summit Health" className="h-8" />
          </button>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/profile')}
              className="flex items-center gap-2 text-summit-moss hover:text-summit-forest hover:bg-summit-sage p-2 rounded-lg font-medium transition"
              title="Update Profile"
            >
              <Person className="w-5 h-5 flex-shrink-0" />
              <span className="hidden sm:inline">Update Profile</span>
            </button>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-2 text-summit-moss hover:text-summit-forest hover:bg-summit-sage p-2 rounded-lg font-medium transition"
              title="Sign Out"
            >
              <Logout className="w-5 h-5 flex-shrink-0" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
