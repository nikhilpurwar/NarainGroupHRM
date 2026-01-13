import React from 'react'
import {
  FiEdit2,
  FiSave,
  FiX,
  FiUsers,
  FiSettings,
} from 'react-icons/fi'

const AddEditRules = ({
  modalOpen,
  setModalOpen,
  editing,
  form,
  setForm,
  subDepartments,
  toggleFields,
  getFieldIcon,
  save,
  loading
}) => {
  if (!modalOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center">
      {/* Modal Container */}
      <div className="
        bg-white w-full sm:max-w-4xl
        h-[100dvh] sm:h-auto
        sm:max-h-[90vh]
        rounded-t-2xl sm:rounded-2xl
        shadow-2xl
        flex flex-col
      ">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-white border-b px-4 sm:px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg">
                <FiSettings className="text-white text-lg sm:text-xl" />
              </div>
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900">
                  {editing ? 'Edit Salary Rule' : 'Create New Salary Rule'}
                </h3>
                <p className="text-xs sm:text-sm text-gray-600">
                  {editing
                    ? 'Update the existing rule settings'
                    : 'Configure new salary calculation rules'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setModalOpen(false)}
              className="p-2 rounded-lg hover:bg-gray-100"
            >
              <FiX size={22} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6 space-y-8 main-scroll">
          {/* Basic Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Sub Department */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <FiUsers />
                Sub Department *
              </label>
              <select
                className="w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500"
                value={form.subDepartment}
                onChange={e =>
                  setForm(f => ({ ...f, subDepartment: e.target.value }))
                }
              >
                <option value="">Select Sub Department</option>
                {subDepartments.map(sd => (
                  <option key={sd._id} value={sd._id}>
                    {sd.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Rule Name */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                <FiEdit2 />
                Rule Name *
              </label>
              <input
                className="w-full border rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Factory Workers Salary Rules"
                value={form.name}
                onChange={e =>
                  setForm(f => ({ ...f, name: e.target.value }))
                }
              />
            </div>
          </div>

          {/* Toggle Fields */}
          <div>
            <h4 className="text-base sm:text-lg font-semibold mb-4">
              Rule Settings
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {toggleFields.map(t => (
                <div
                  key={t.key}
                  onClick={() =>
                    setForm(f => ({ ...f, [t.key]: !f[t.key] }))
                  }
                  className={`
                    card-hover border rounded-xl p-4 cursor-pointer transition
                    ${form[t.key]
                      ? 'bg-blue-50 border-blue-300'
                      : 'bg-white border-gray-200 hover:bg-gray-50'}
                  `}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`
                        p-2 rounded-lg
                        ${form[t.key]
                          ? 'bg-blue-100 text-blue-600'
                          : 'bg-gray-100 text-gray-500'}
                      `}>
                        {t.icon}
                      </div>
                      <span className="font-medium text-sm">
                        {t.label}
                      </span>
                    </div>

                    <div className={`
                      relative w-10 h-6 rounded-full
                      ${form[t.key] ? 'bg-blue-600' : 'bg-gray-300'}
                    `}>
                      <div
                        className={`
                          absolute top-1 w-4 h-4 bg-white rounded-full transition-all
                          ${form[t.key] ? 'right-1' : 'left-1'}
                        `}
                      />
                    </div>
                  </div>

                  <p className="text-xs text-gray-600">
                    {t.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Numeric Fields */}
          <div>
            <h4 className="text-base sm:text-lg font-semibold mb-4">
              Additional Settings
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[
                {
                  key: 'sundayAutopayRequiredLastWorkingDays',
                  label: 'Sunday AutoPay - Required Working Days',
                  min: 0,
                  max: 31
                },
                {
                  key: 'festivalAutopayRequiredPrevDays',
                  label: 'Festival AutoPay - Required Previous Days',
                  min: 0,
                  max: 31
                },
                {
                  key: 'shiftHours',
                  label: 'Daily Shift Hours',
                  min: 1,
                  max: 24
                },
                {
                  key: 'workingDaysPerWeek',
                  label: 'Working Days Per Week',
                  min: 5,
                  max: 6
                }
              ].map(field => (
                <div key={field.key}>
                  <label className="flex items-center gap-2 text-sm font-medium mb-2">
                    {getFieldIcon(field.key)}
                    {field.label}
                  </label>

                  <div className="relative">
                    <input
                      type="number"
                      min={field.min}
                      max={field.max}
                      value={form[field.key]}
                      onChange={e =>
                        setForm(f => ({
                          ...f,
                          [field.key]: +e.target.value
                        }))
                      }
                      className="w-full border rounded-xl px-4 py-3 pr-14 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-gray-500">
                      {field.key === 'shiftHours' ? 'hrs' : 'days'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 border-t px-4 sm:px-6 py-4 flex gap-3 justify-end">
          <button
            onClick={() => setModalOpen(false)}
            className="px-4 py-2 border rounded-xl text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>

          <button
            onClick={save}
            disabled={loading || !form.subDepartment || !form.name?.trim()}
            className="px-5 py-2 rounded-xl text-white bg-gradient-to-r from-blue-600 to-indigo-600 disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <FiSave />
                {editing ? 'Update Rule' : 'Create Rule'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AddEditRules
