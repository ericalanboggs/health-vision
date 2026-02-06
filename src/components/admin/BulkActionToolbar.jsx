import { Send, Delete, Close } from '@mui/icons-material'

/**
 * Toolbar that appears when users are selected in the admin table
 * @param {Object} props
 * @param {number} props.selectedCount
 * @param {Function} props.onSendSMS
 * @param {Function} props.onDelete
 * @param {Function} props.onClear
 */
export default function BulkActionToolbar({ selectedCount, onSendSMS, onDelete, onClear }) {
  if (selectedCount === 0) return null

  return (
    <div className="bg-summit-mint border border-summit-sage rounded-lg p-4 mb-4 animate-in slide-in-from-top-2 duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-summit-forest font-medium">
            {selectedCount} selected
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={onSendSMS}
              className="flex items-center gap-2 px-3 py-1.5 bg-summit-emerald hover:bg-emerald-700 text-white text-sm font-medium rounded-lg transition"
            >
              <Send className="w-4 h-4" />
              Send SMS
            </button>

            <button
              onClick={onDelete}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition"
            >
              <Delete className="w-4 h-4" />
              Delete
            </button>
          </div>
        </div>

        <button
          onClick={onClear}
          className="p-1.5 text-summit-moss hover:text-summit-forest hover:bg-summit-sage rounded-lg transition"
          title="Clear selection"
        >
          <Close className="w-5 h-5" />
        </button>
      </div>
    </div>
  )
}
