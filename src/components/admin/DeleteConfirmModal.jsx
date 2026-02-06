import { useState, useEffect } from 'react'
import { Close, Warning, Delete, CheckCircle, Error } from '@mui/icons-material'
import { deleteUsers } from '../../services/adminService'

/**
 * Modal for confirming user deletion
 * @param {Object} props
 * @param {boolean} props.isOpen
 * @param {Function} props.onClose
 * @param {Array<{id: string, name: string, email: string}>} props.users
 * @param {Function} props.onSuccess - Called after successful deletion
 */
export default function DeleteConfirmModal({ isOpen, onClose, users, onSuccess }) {
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [result, setResult] = useState(null)

  const isConfirmed = confirmText === 'DELETE'

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setConfirmText('')
      setResult(null)
    }
  }, [isOpen])

  const handleDelete = async () => {
    if (deleting || !isConfirmed) return

    setDeleting(true)
    setResult(null)

    try {
      const userIds = users.map(u => u.id)
      const response = await deleteUsers(userIds)

      if (response.success) {
        setResult({ success: true, deleted: response.deleted })

        // Auto-close after success
        setTimeout(() => {
          onSuccess?.()
          onClose()
        }, 1500)
      } else {
        setResult({
          success: false,
          error: response.error
        })
      }
    } catch (error) {
      setResult({
        success: false,
        error: error.message
      })
    } finally {
      setDeleting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2 text-red-600">
            <Warning className="w-6 h-6" />
            <h2 className="text-xl font-semibold">
              Delete {users.length} {users.length === 1 ? 'user' : 'users'}?
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-600 transition"
          >
            <Close className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          <p className="text-stone-600">
            This will permanently delete these users and all their data:
          </p>

          {/* User list */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 max-h-40 overflow-y-auto">
            <ul className="space-y-1">
              {users.map(user => (
                <li key={user.id} className="text-sm text-stone-700">
                  <span className="font-medium">{user.name}</span>
                  <span className="text-stone-500 ml-1">({user.email})</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Confirmation input */}
          <div>
            <label className="block text-sm font-medium text-stone-600 mb-1">
              Type "DELETE" to confirm:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
              placeholder="DELETE"
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 transition"
              disabled={deleting}
            />
          </div>

          {/* Result message */}
          {result && (
            <div className={`flex items-start gap-2 rounded-lg p-3 ${
              result.success
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}>
              {result.success ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-green-800">
                    Successfully deleted {result.deleted} {result.deleted === 1 ? 'user' : 'users'}
                  </p>
                </>
              ) : (
                <>
                  <Error className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">
                    {result.error || 'Failed to delete users'}
                  </p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-stone-600 hover:text-stone-800 font-medium transition"
            disabled={deleting}
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting || !isConfirmed}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium rounded-lg transition"
          >
            {deleting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Delete className="w-4 h-4" />
                Delete Permanently
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
