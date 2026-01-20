import React from "react";
import { MdDeleteOutline } from "react-icons/md";

const DeleteConfirmationModal = ({
 open,
  title = "Delete Confirmation",
  message = "Are you sure you want to permanently delete this item?",
  itemName,
  value,
  loading,
  onCancel,
  onConfirm,
}) => {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-[92%] max-w-md rounded-2xl bg-white shadow-2xl p-6">

        {/* Header */}
        <div className="flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-100">
            <MdDeleteOutline className="text-red-600 text-xl" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <p className="text-sm text-gray-500">
              This action cannot be undone
            </p>
          </div>
        </div>

        {/* Message */}
        <p className="mt-4 text-sm text-gray-700 leading-relaxed">
          {message}
        </p>

        {/* Item Preview */}
        {(itemName || value) && (
          <div className="mt-4 space-y-2">
            {itemName && (
              <div className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800">
                {itemName}
              </div>
            )}
            {value && (
              <div className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800">
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
            onClick={onConfirm}
            disabled={loading}
            className="px-5 py-2 rounded-xl font-semibold text-white
                       bg-red-600 hover:bg-red-700 transition
                       disabled:opacity-50"
          >
            {loading ? "Deleting..." : "Delete"}
          </button>
        </div>

      </div>
    </div>
  )
}


export default DeleteConfirmationModal;
