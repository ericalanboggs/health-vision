import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllUsers } from '../services/adminService'
import { CheckCircle, AlertTriangle, Loader2, ArrowUpDown } from 'lucide-react'

export default function Admin() {
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortDesc, setSortDesc] = useState(true)
  const [filterNeedsSetup, setFilterNeedsSetup] = useState(false)

  useEffect(() => {
    loadUsers()
  }, [])

  const loadUsers = async () => {
    setLoading(true)
    const { success, data } = await getAllUsers()
    if (success) {
      setUsers(data)
    }
    setLoading(false)
  }

  const formatRelativeTime = (timestamp) => {
    if (!timestamp) return 'Never'
    
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
    return date.toLocaleDateString()
  }

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortDesc(!sortDesc)
    } else {
      setSortBy(field)
      setSortDesc(true)
    }
  }

  const getSortedUsers = () => {
    let filtered = filterNeedsSetup 
      ? users.filter(u => !u.pilotReady)
      : users

    return [...filtered].sort((a, b) => {
      let aVal, bVal

      switch (sortBy) {
        case 'name':
          aVal = a.name.toLowerCase()
          bVal = b.name.toLowerCase()
          break
        case 'lastLogin':
          aVal = a.lastLogin ? new Date(a.lastLogin).getTime() : 0
          bVal = b.lastLogin ? new Date(b.lastLogin).getTime() : 0
          break
        case 'pilotReady':
          aVal = a.pilotReady ? 1 : 0
          bVal = b.pilotReady ? 1 : 0
          break
        case 'createdAt':
        default:
          aVal = new Date(a.createdAt).getTime()
          bVal = new Date(b.createdAt).getTime()
          break
      }

      if (aVal < bVal) return sortDesc ? 1 : -1
      if (aVal > bVal) return sortDesc ? -1 : 1
      return 0
    })
  }

  const sortedUsers = getSortedUsers()

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-stone-50 to-amber-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-50 to-amber-50">
      <header className="bg-white shadow-sm border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-stone-900">Admin Dashboard</h1>
          <p className="text-stone-600 mt-1">Summit Pilot User Overview</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-stone-200 overflow-hidden">
          <div className="p-4 border-b border-stone-200 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm text-stone-600">
                {sortedUsers.length} {sortedUsers.length === 1 ? 'user' : 'users'}
              </span>
              <label className="flex items-center gap-2 text-sm text-stone-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filterNeedsSetup}
                  onChange={(e) => setFilterNeedsSetup(e.target.checked)}
                  className="rounded border-stone-300"
                />
                Show only "Needs Setup"
              </label>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-stone-600 uppercase tracking-wider cursor-pointer hover:bg-stone-100"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      Name
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-stone-600 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-stone-600 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-stone-600 uppercase tracking-wider">
                    SMS
                  </th>
                  <th 
                    className="px-4 py-3 text-left text-xs font-medium text-stone-600 uppercase tracking-wider cursor-pointer hover:bg-stone-100"
                    onClick={() => handleSort('lastLogin')}
                  >
                    <div className="flex items-center gap-1">
                      Last Login
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-stone-600 uppercase tracking-wider">
                    Habits
                  </th>
                  <th 
                    className="px-4 py-3 text-center text-xs font-medium text-stone-600 uppercase tracking-wider cursor-pointer hover:bg-stone-100"
                    onClick={() => handleSort('pilotReady')}
                  >
                    <div className="flex items-center gap-1 justify-center">
                      Status
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {sortedUsers.map(user => (
                  <tr 
                    key={user.id}
                    onClick={() => navigate(`/admin/users/${user.id}`)}
                    className="hover:bg-stone-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-stone-900">
                      {user.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-600">
                      {user.email}
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-600">
                      {user.phone}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      {user.smsOptIn ? (
                        <span className="text-green-600 font-medium">Y</span>
                      ) : (
                        <span className="text-stone-400">N</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-600">
                      <span title={user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}>
                        {formatRelativeTime(user.lastLogin)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-center text-stone-600">
                      {user.activeHabitsCount}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {user.pilotReady ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3" />
                          Pilot Ready
                        </span>
                      ) : (
                        <span 
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800"
                          title={`Missing: ${!user.hasLoggedIn ? 'Login, ' : ''}${!user.hasHealthVision ? 'Health Vision, ' : ''}${!user.hasActiveHabits ? 'Habits' : ''}`}
                        >
                          <AlertTriangle className="w-3 h-3" />
                          Needs Setup
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  )
}
