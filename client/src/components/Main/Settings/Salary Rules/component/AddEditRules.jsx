import React from 'react'
import {
  FiEdit2,
  FiSave,
  FiX,
  FiUsers,
  FiSettings,
} from 'react-icons/fi'

const AddEditRules = ({ modalOpen, setModalOpen, editing, form, setForm, subDepartments, toggleFields, getFieldIcon, save, loading }) => {
    if (!modalOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl max-h-[90vh] ">
                {/* Modal Header */}
                <div className="sticky top-0 bg-white z-10 border-b p-6 rounded-t-2xl">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg">
                                <FiSettings className="text-white text-xl" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">
                                    {editing ? 'Edit Salary Rule' : 'Create New Salary Rule'}
                                </h3>
                                <p className="text-sm text-gray-600">
                                    {editing ? 'Update the existing rule settings' : 'Configure new salary calculation rules'}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={() => setModalOpen(false)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            <FiX size={24} />
                        </button>
                    </div>
                </div>

                {/* Modal Content */}
                <div className="p-6 overflow-y-auto max-h-[70vh] main-scroll">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        {/* Sub Department */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                <FiUsers className="text-gray-400" />
                                Sub Department *
                            </label>
                            <select
                                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                value={form.subDepartment}
                                onChange={e => setForm(f => ({ ...f, subDepartment: e.target.value }))}
                            >
                                <option value="">Select Sub Department</option>
                                {subDepartments.map(sd => (
                                    <option key={sd._id} value={sd._id}>{sd.name}</option>
                                ))}
                            </select>
                        </div>

                        {/* Rule Name */}
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                <FiEdit2 className="text-gray-400" />
                                Rule Name *
                            </label>
                            <input
                                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                placeholder="e.g., Factory Workers Salary Rules"
                                value={form.name}
                                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                            />
                        </div>
                    </div>

                    {/* Toggle Fields Grid */}
                    <div className="mb-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Rule Settings</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {toggleFields.map(t => (
                                <div
                                    key={t.key}
                                    className={`border rounded-xl p-4 cursor-pointer transition-all ${form[t.key]
                                        ? 'border-blue-300 bg-blue-50'
                                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                        }`}
                                    onClick={() => setForm(f => ({ ...f, [t.key]: !f[t.key] }))}
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${form[t.key] ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                                                }`}>
                                                {t.icon}
                                            </div>
                                            <span className="font-medium text-gray-900">{t.label}</span>
                                        </div>
                                        <div className={`relative w-10 h-6 rounded-full transition-colors ${form[t.key] ? 'bg-blue-600' : 'bg-gray-300'
                                            }`}>
                                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${form[t.key] ? 'right-1' : 'left-1'
                                                }`} />
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-600">{t.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Numeric Input Fields */}
                    <div className="mb-6">
                        <h4 className="text-lg font-semibold text-gray-900 mb-4">Additional Settings</h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            {[
                                { key: 'shiftHours', label: 'Daily Shift Hours', min: 1, max: 24 },
                                { key: 'sundayAutopayRequiredLastWorkingDays', label: 'Sunday AutoPay - Required Working Days', min: 0, max: 31 },
                                { key: 'festivalAutopayRequiredPrevDays', label: 'Festival AutoPay - Required Previous Days', min: 0, max: 31 },
                                { key: 'workingDaysPerWeek', label: 'Working Days Per Week', min: 5, max: 6 }
                            ].map(field => (
                                <div key={field.key}>
                                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                        {getFieldIcon(field.key)}
                                        {field.label}
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            min={field.min}
                                            max={field.max}
                                            className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all pr-12"
                                            value={form[field.key]}
                                            onChange={e => setForm(f => ({ ...f, [field.key]: +e.target.value }))}
                                        />
                                        <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500">
                                            {field.key === 'shiftHours' ? 'hours' : 'days'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>


                </div>

                {/* Modal Actions */}
                <div className="flex justify-end gap-3 p-4 border-t">
                    <button
                        onClick={() => setModalOpen(false)}
                        className="px-5 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2"
                    >
                        <FiX />
                        Cancel
                    </button>
                    <button
                        onClick={save}
                        disabled={loading || !form.subDepartment || !form.name?.trim()}
                        className="px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                                Saving...
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