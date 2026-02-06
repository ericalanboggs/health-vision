import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAllUsers, inviteUser } from '../services/adminService'
import { CheckCircle, Warning, Autorenew, SwapVert, PersonAdd, Send } from '@mui/icons-material'
import { Checkbox } from '@summit/design-system'
import BulkActionToolbar from '../components/admin/BulkActionToolbar'
import SendSMSModal from '../components/admin/SendSMSModal'
import DeleteConfirmModal from '../components/admin/DeleteConfirmModal'

export default function Admin() {
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState('createdAt')
  const [sortDesc, setSortDesc] = useState(true)
  const [filterNeedsSetup, setFilterNeedsSetup] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [inviteStatus, setInviteStatus] = useState(null)

  // Selection state
  const [selectedUserIds, setSelectedUserIds] = useState(new Set())

  // Modal state
  const [showSMSModal, setShowSMSModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

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

  // Selection handlers
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedUserIds(new Set(sortedUsers.map(u => u.id)))
    } else {
      setSelectedUserIds(new Set())
    }
  }

  const handleToggleUser = (userId, checked) => {
    const newSet = new Set(selectedUserIds)
    if (checked) {
      newSet.add(userId)
    } else {
      newSet.delete(userId)
    }
    setSelectedUserIds(newSet)
  }

  const clearSelection = () => {
    setSelectedUserIds(new Set())
  }

  // Get selected users for modals
  const selectedUsers = sortedUsers.filter(u => selectedUserIds.has(u.id))

  // Header checkbox state
  const allSelected = sortedUsers.length > 0 && selectedUserIds.size === sortedUsers.length
  const someSelected = selectedUserIds.size > 0 && selectedUserIds.size < sortedUsers.length

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inviteEmail)) {
      setInviteStatus({ type: 'error', message: 'Please enter a valid email address' })
      return
    }

    setInviting(true)
    setInviteStatus(null)

    const { success, error } = await inviteUser(inviteEmail.trim().toLowerCase())

    if (success) {
      setInviteStatus({ type: 'success', message: `Invitation sent to ${inviteEmail}` })
      setInviteEmail('')
      setTimeout(() => setInviteStatus(null), 5000)
    } else {
      setInviteStatus({ type: 'error', message: error || 'Failed to send invitation' })
    }

    setInviting(false)
  }

  // Modal handlers
  const handleSMSSuccess = () => {
    clearSelection()
  }

  const handleDeleteSuccess = () => {
    clearSelection()
    loadUsers() // Refresh the user list
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Autorenew className="w-8 h-8 animate-spin text-summit-emerald" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="bg-white shadow-sm border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-summit-forest">Admin Dashboard</h1>
              <p className="text-stone-600 mt-1">Summit User Management</p>
            </div>

            {/* Invite User - only show when no selection */}
            {selectedUserIds.size === 0 && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
                    <PersonAdd className="w-5 h-5 text-summit-moss" />
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleInvite()}
                      placeholder="Invite user by email"
                      className="border-none outline-none text-sm w-48 placeholder-stone-400"
                      disabled={inviting}
                    />
                  </div>
                  <button
                    onClick={handleInvite}
                    disabled={inviting || !inviteEmail.trim()}
                    className="flex items-center gap-2 bg-summit-emerald hover:bg-emerald-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium px-4 py-2 rounded-lg transition text-sm"
                  >
                    {inviting ? (
                      <Autorenew className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    Send
                  </button>
                </div>
                {inviteStatus && (
                  <p className={`text-xs ${inviteStatus.type === 'success' ? 'text-summit-emerald' : 'text-red-600'}`}>
                    {inviteStatus.message}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Bulk Action Toolbar */}
        <BulkActionToolbar
          selectedCount={selectedUserIds.size}
          onSendSMS={() => setShowSMSModal(true)}
          onDelete={() => setShowDeleteModal(true)}
          onClear={clearSelection}
        />

        <div className="bg-white rounded-lg shadow-sm border border-stone-200 overflow-hidden">
          <div className="p-4 border-b border-stone-200 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="text-sm text-stone-600">
                {sortedUsers.length} {sortedUsers.length === 1 ? 'user' : 'users'}
              </span>
              <Checkbox
                size="sm"
                shape="rounded"
                checked={filterNeedsSetup}
                onChange={(e) => setFilterNeedsSetup(e.target.checked)}
                label='Show only "Needs Setup"'
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-stone-50 border-b border-stone-200">
                <tr>
                  {/* Checkbox column */}
                  <th className="px-4 py-3 text-center w-14">
                    <div className="flex justify-center">
                      <Checkbox
                        size="sm"
                        shape="rounded"
                        checked={allSelected}
                        indeterminate={someSelected}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                      />
                    </div>
                  </th>
                  <th
                    className="px-4 py-3 text-left text-xs font-medium text-stone-600 uppercase tracking-wider cursor-pointer hover:bg-stone-100"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      Name
                      <SwapVert className="w-3 h-3" />
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
                      <SwapVert className="w-3 h-3" />
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
                      <SwapVert className="w-3 h-3" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200">
                {sortedUsers.map(user => (
                  <tr
                    key={user.id}
                    className={`hover:bg-stone-50 cursor-pointer transition-colors ${
                      selectedUserIds.has(user.id) ? 'bg-summit-mint/30' : ''
                    }`}
                  >
                    {/* Checkbox */}
                    <td
                      className="px-4 py-3 text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex justify-center">
                        <Checkbox
                          size="sm"
                          shape="rounded"
                          checked={selectedUserIds.has(user.id)}
                          onChange={(e) => handleToggleUser(user.id, e.target.checked)}
                        />
                      </div>
                    </td>
                    <td
                      className="px-4 py-3 text-sm font-medium text-summit-forest"
                      onClick={() => navigate(`/admin/users/${user.id}`)}
                    >
                      {user.name}
                    </td>
                    <td
                      className="px-4 py-3 text-sm text-stone-600"
                      onClick={() => navigate(`/admin/users/${user.id}`)}
                    >
                      {user.email}
                    </td>
                    <td
                      className="px-4 py-3 text-sm text-stone-600"
                      onClick={() => navigate(`/admin/users/${user.id}`)}
                    >
                      {user.phone}
                    </td>
                    <td
                      className="px-4 py-3 text-sm text-center"
                      onClick={() => navigate(`/admin/users/${user.id}`)}
                    >
                      {user.smsOptIn ? (
                        <span className="text-summit-emerald font-medium">Y</span>
                      ) : (
                        <span className="text-stone-400">N</span>
                      )}
                    </td>
                    <td
                      className="px-4 py-3 text-sm text-stone-600"
                      onClick={() => navigate(`/admin/users/${user.id}`)}
                    >
                      <span title={user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}>
                        {formatRelativeTime(user.lastLogin)}
                      </span>
                    </td>
                    <td
                      className="px-4 py-3 text-sm text-center text-stone-600"
                      onClick={() => navigate(`/admin/users/${user.id}`)}
                    >
                      {user.activeHabitsCount}
                    </td>
                    <td
                      className="px-4 py-3 text-center"
                      onClick={() => navigate(`/admin/users/${user.id}`)}
                    >
                      {user.pilotReady ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-summit-mint text-summit-forest">
                          <CheckCircle className="w-3 h-3" />
                          Pilot Ready
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800"
                          title={`Missing: ${!user.hasLoggedIn ? 'Login, ' : ''}${!user.hasHealthVision ? 'Health Vision, ' : ''}${!user.hasActiveHabits ? 'Habits' : ''}`}
                        >
                          <Warning className="w-3 h-3" />
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

      {/* Modals */}
      <SendSMSModal
        isOpen={showSMSModal}
        onClose={() => setShowSMSModal(false)}
        recipients={selectedUsers}
        onSuccess={handleSMSSuccess}
      />

      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        users={selectedUsers}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  )
}
