import React from "react"
import { FiTrash2, FiAlertTriangle } from "react-icons/fi"

const ConfirmDelete = ({
  isOpen,
  title = "Confirm Delete",
  message = "This action cannot be undone.",
  itemName,
  value,
  loading,
  onCancel,
  onConfirm,
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className="bg-white rounded-2xl shadow-2xl w-[92%] max-w-md p-6
                   animate-[scaleFade_0.25s_ease-out]"
      >
        {/* Header */}
        <div className="flex items-center gap-4 border-b pb-4">
          <div className="p-3 bg-red-100 rounded-full">
            <FiTrash2 className="text-red-600 text-xl" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500">
              Permanent action
            </p>
          </div>
        </div>

        {/* Warning */}
        <div className="mt-4 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl p-4">
          <FiAlertTriangle className="text-red-600 mt-0.5" />
          <p className="text-sm text-red-700">
            {message}
          </p>
        </div>

        {/* Item Details */}
        {(itemName || value) && (
          <div className="mt-4 space-y-2">
            {itemName && (
              <div className="bg-gray-100 rounded-lg px-4 py-2 text-sm font-semibold text-gray-800">
                {itemName}
              </div>
            )}
            {value && (
              <div className="bg-gray-100 rounded-lg px-4 py-2 text-sm font-semibold text-gray-800">
                {value}
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={loading}
            className="px-5 py-2 rounded-xl bg-gray-100 text-gray-700
                       hover:bg-gray-200 transition disabled:opacity-50"
          >
            Cancel
          </button>

          <button
            disabled={loading}
            onClick={onConfirm}
            className="px-5 py-2 rounded-xl text-white font-semibold
                       bg-gradient-to-r from-red-600 to-red-700
                       hover:from-red-700 hover:to-red-800
                       transition shadow-lg disabled:opacity-50"
          >
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>

      {/* Animation */}
      <style>
        {`
          @keyframes scaleFade {
            from {
              opacity: 0;
              transform: scale(0.95);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }
        `}
      </style>
    </div>
  )
}

export default ConfirmDelete
