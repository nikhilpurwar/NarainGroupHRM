import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useHierarchy } from '../../../../context/HierarchyContext'
import { toast } from 'react-toastify'
import { 
  FiPlus, 
  FiEdit2, 
  FiTrash2, 
  FiSave, 
  FiX,
  FiClock,
  FiCalendar,
  FiSun,
  FiMoon,
  FiUsers,
  FiCheckCircle,
  FiXCircle,
  FiSettings,
  FiAlertCircle,
  FiChevronRight,
  FiFilter
} from 'react-icons/fi'
import { 
  MdOutlineWorkOff,
  MdOutlineFestival,
  MdOutlineSecurity,
  MdOutlineEventAvailable,
  MdOutlineCurrencyRupee
} from 'react-icons/md'
import { TbCalendarStats, TbDoorExit } from 'react-icons/tb'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5100'

const defaultRule = {
  subDepartment: '',
  name: '',
  fixedSalary: false,
  allowFestivalOT: false,
  allowDailyOT: false,
  allowSundayOT: false,
  allowNightOT: false,
  absenceDeduction: false,
  gatePassDeduction: false,
  shiftHours: 8,
  oneHolidayPerMonth: false,
  sundayAutopayRequiredLastWorkingDays: 4,
  festivalAutopayRequiredPrevDays: 2,
}

const toggleFields = [
  { key: 'fixedSalary', label: 'Fixed Salary', icon: <MdOutlineCurrencyRupee />, description: 'Employee receives fixed salary regardless of attendance' },
  { key: 'allowDailyOT', label: 'Daily OT Allowed', icon: <FiClock />, description: 'Allow daily overtime calculations' },
  { key: 'allowFestivalOT', label: 'Festival OT Allowed', icon: <MdOutlineFestival />, description: 'Allow overtime on festival days' },
  { key: 'allowSundayOT', label: 'Sunday OT Allowed', icon: <FiSun />, description: 'Allow overtime on Sundays' },
  { key: 'allowNightOT', label: 'Night OT Allowed', icon: <FiMoon />, description: 'Allow night shift overtime' },
  { key: 'absenceDeduction', label: 'Absence Deduction', icon: <MdOutlineWorkOff />, description: 'Deduct salary for absent days' },
  { key: 'gatePassDeduction', label: 'Gate Pass Deduction', icon: <TbDoorExit />, description: 'Deduct for gate pass violations' },
  { key: 'oneHolidayPerMonth', label: 'One Holiday Per Month', icon: <MdOutlineEventAvailable />, description: 'Allow one paid holiday per month' },
]

const SalaryRules = () => {
  const { subDepartments } = useHierarchy()
  const [rules, setRules] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState(defaultRule)
  const [loading, setLoading] = useState(true)
  const [filteredRules, setFilteredRules] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [activeFilters, setActiveFilters] = useState({
    fixedSalary: null,
    allowOT: null,
  })

  const fetchRules = async () => {
    try {
      setLoading(true)
      const res = await axios.get(`${API_URL}/api/salary/rules`)
      if (res.data.success) {
        setRules(res.data.data || [])
        setFilteredRules(res.data.data || [])
      }
    } catch {
      toast.error('Failed to load salary rules')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchRules()
  }, [])

  // Apply filters and search
  useEffect(() => {
    let result = rules

    // Apply search
    if (searchTerm) {
      result = result.filter(rule =>
        rule.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        rule.subDepartment?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Apply filters
    if (activeFilters.fixedSalary !== null) {
      result = result.filter(rule => rule.fixedSalary === activeFilters.fixedSalary)
    }
    if (activeFilters.allowOT !== null) {
      result = result.filter(rule => 
        activeFilters.allowOT 
          ? rule.allowDailyOT || rule.allowFestivalOT || rule.allowSundayOT || rule.allowNightOT
          : !(rule.allowDailyOT || rule.allowFestivalOT || rule.allowSundayOT || rule.allowNightOT)
      )
    }

    setFilteredRules(result)
  }, [rules, searchTerm, activeFilters])

  const openAdd = () => {
    setEditing(null)
    setForm(defaultRule)
    setModalOpen(true)
  }

  const openEdit = (r) => {
    setEditing(r._id)
    setForm({
      ...defaultRule,
      ...r,
      subDepartment: r.subDepartment?._id || r.subDepartment,
    })
    setModalOpen(true)
  }

  const save = async () => {
    if (!form.subDepartment) {
      toast.error('Please select a sub department')
      return
    }
    if (!form.name?.trim()) {
      toast.error('Please enter a rule name')
      return
    }

    try {
      setLoading(true)
      const req = editing
        ? axios.put(`${API_URL}/api/salary/rules/${editing}`, form)
        : axios.post(`${API_URL}/api/salary/rules`, form)

      const res = await req
      if (res.data.success) {
        toast.success(editing ? 'Rule updated successfully' : 'Rule created successfully')
        setModalOpen(false)
        fetchRules()
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save rule')
    } finally {
      setLoading(false)
    }
  }

  const remove = async (id) => {
    if (!window.confirm('Are you sure you want to delete this rule?')) return
    
    try {
      const res = await axios.delete(`${API_URL}/api/salary/rules/${id}`)
      if (res.data.success) {
        toast.success('Rule deleted successfully')
        fetchRules()
      }
    } catch {
      toast.error('Failed to delete rule')
    }
  }

  const getStatusIcon = (value) => 
    value ? 
      <FiCheckCircle className="text-green-500" size={18} /> : 
      <FiXCircle className="text-red-400" size={18} />

  const getFieldIcon = (key) => {
    switch(key) {
      case 'shiftHours': return <FiClock />
      case 'sundayAutopayRequiredLastWorkingDays': return <TbCalendarStats />
      case 'festivalAutopayRequiredPrevDays': return <MdOutlineFestival />
      default: return <FiSettings />
    }
  }

  return (
    <div className="min-h-screen bg-white p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-gray-900 to-gray-400 rounded-xl">
                  <FiSettings className="text-white text-xl" />
                </div>
                Salary Rules Management
              </h1>
              <p className="text-gray-600 mt-2">
                Configure salary calculation rules for different departments
              </p>
            </div>
            
            <button
              onClick={openAdd}
              className="group flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-gray-900 to-gray-400 text-white rounded-xl hover:from-gray-400 hover:to-gray-900 transition-all shadow-lg hover:shadow-2xl"
            >
              <FiPlus className="group-hover:rotate-90 transition-transform" size={20} />
              <span className="font-semibold">Add New Rule</span>
            </button>
          </div>

          {/* Search and Filters */}
          {/* <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
                  <FiFilter size={18} />
                </div>
                <input
                  type="text"
                  placeholder="Search rules by name or department..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveFilters({...activeFilters, fixedSalary: !activeFilters.fixedSalary})}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                    activeFilters.fixedSalary === true 
                      ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <MdOutlineCurrencyRupee />
                  Fixed Salary
                </button>
                <button
                  onClick={() => setActiveFilters({...activeFilters, allowOT: activeFilters.allowOT === null ? true : null})}
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                    activeFilters.allowOT === true 
                      ? 'bg-green-100 text-green-700 border border-green-300' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <FiClock />
                  OT Allowed
                </button>
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setActiveFilters({ fixedSalary: null, allowOT: null })
                  }}
                  className="px-4 py-2 rounded-lg flex items-center gap-2 bg-gray-100 text-gray-700 hover:bg-gray-200"
                >
                  <FiX />
                  Clear Filters
                </button>
              </div>

              <div className="text-right">
                <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-full text-sm font-medium">
                  <FiUsers />
                  {filteredRules.length} rule{filteredRules.length !== 1 ? 's' : ''} found
                </span>
              </div>
            </div>
          </div> */}
        </div>

        {/* Rules Table */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden pb-2">
          {loading ? (
            <div className="flex justify-center items-center py-16">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600">Loading salary rules...</p>
              </div>
            </div>
          ) : filteredRules.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full flex items-center justify-center mb-6">
                <FiSettings className="text-blue-400 text-3xl" />
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                {searchTerm || Object.values(activeFilters).some(v => v !== null) 
                  ? 'No matching rules found' 
                  : 'No salary rules yet'}
              </h3>
              <p className="text-gray-600 mb-6 max-w-md">
                {searchTerm || Object.values(activeFilters).some(v => v !== null)
                  ? 'Try adjusting your search or filters'
                  : 'Create your first salary rule to get started'}
              </p>
              <button
                onClick={openAdd}
                className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all"
              >
                <FiPlus />
                Add Your First Rule
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-100 to-blue-50 border-b">
                    <th className="text-left p-4 font-semibold text-gray-700">Sub Department</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Rule Name</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Fixed Salary</th>
                    <th className="text-left p-4 font-semibold text-gray-700">OT Settings</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Shift Hours</th>
                    <th className="text-left p-4 font-semibold text-gray-700">AutoPay Rules</th>
                    <th className="text-left p-4 font-semibold text-gray-700">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRules.map((r) => (
                    <tr 
                      key={r._id} 
                      className="border-b hover:bg-blue-50/30 transition-colors group"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <FiUsers className="text-blue-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{r.subDepartment?.name || 'N/A'}</p>
                            <p className="text-xs text-gray-500">Sub Department</p>
                          </div>
                        </div>
                      </td>
                      
                      <td className="p-4">
                        <div>
                          <p className="font-semibold text-gray-900">{r.name || 'Unnamed Rule'}</p>
                          <p className="text-xs text-gray-500">Rule identifier</p>
                        </div>
                      </td>
                      
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(r.fixedSalary)}
                          <span className={r.fixedSalary ? 'text-green-600 font-medium' : 'text-gray-600'}>
                            {r.fixedSalary ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </td>
                      
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {r.allowDailyOT && (
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">Daily</span>
                          )}
                          {r.allowSundayOT && (
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">Sunday</span>
                          )}
                          {r.allowFestivalOT && (
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">Festival</span>
                          )}
                          {r.allowNightOT && (
                            <span className="px-2 py-1 bg-indigo-100 text-indigo-700 rounded text-xs">Night</span>
                          )}
                          {!r.allowDailyOT && !r.allowSundayOT && !r.allowFestivalOT && !r.allowNightOT && (
                            <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">No OT</span>
                          )}
                        </div>
                      </td>
                      
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <FiClock className="text-gray-400" />
                          <span className="font-semibold">{r.shiftHours}</span>
                          <span className="text-gray-500 text-sm">hours/day</span>
                        </div>
                      </td>
                      
                      <td className="p-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <TbCalendarStats className="text-blue-400" />
                            <span>Sun: {r.sundayAutopayRequiredLastWorkingDays} days</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <MdOutlineFestival className="text-orange-400" />
                            <span>Festival: {r.festivalAutopayRequiredPrevDays} days</span>
                          </div>
                        </div>
                      </td>
                      
                      <td className="p-4">
                        <div className="flex items-center gap-2 ">
                          <button
                            onClick={() => openEdit(r)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Rule"
                          >
                            <FiEdit2 size={18} />
                          </button>
                          <button
                            onClick={() => remove(r._id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Rule"
                          >
                            <FiTrash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Help Section */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FiClock className="text-blue-600" />
              </div>
              <h4 className="font-semibold text-gray-900">OT Settings</h4>
            </div>
            <p className="text-sm text-gray-600">
              Configure when overtime is allowed. Different types can be enabled separately.
            </p>
          </div>
          
          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <MdOutlineCurrencyRupee className="text-green-600" />
              </div>
              <h4 className="font-semibold text-gray-900">Fixed Salary</h4>
            </div>
            <p className="text-sm text-gray-600">
              When enabled, employees receive fixed salary regardless of attendance.
            </p>
          </div>
          
          <div className="bg-white rounded-xl p-5 border border-gray-200">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <FiAlertCircle className="text-purple-600" />
              </div>
              <h4 className="font-semibold text-gray-900">Deductions</h4>
            </div>
            <p className="text-sm text-gray-600">
              Configure automatic deductions for absence and gate pass violations.
            </p>
          </div>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white z-10 border-b p-6">
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
            <div className="p-6">
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
                      className={`border rounded-xl p-4 cursor-pointer transition-all ${
                        form[t.key] 
                          ? 'border-blue-300 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                      onClick={() => setForm(f => ({ ...f, [t.key]: !f[t.key] }))}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${
                            form[t.key] ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'
                          }`}>
                            {t.icon}
                          </div>
                          <span className="font-medium text-gray-900">{t.label}</span>
                        </div>
                        <div className={`relative w-10 h-6 rounded-full transition-colors ${
                          form[t.key] ? 'bg-blue-600' : 'bg-gray-300'
                        }`}>
                          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                            form[t.key] ? 'right-1' : 'left-1'
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {[
                    { key: 'shiftHours', label: 'Daily Shift Hours', min: 1, max: 24 },
                    { key: 'sundayAutopayRequiredLastWorkingDays', label: 'Sunday AutoPay - Required Working Days', min: 0, max: 31 },
                    { key: 'festivalAutopayRequiredPrevDays', label: 'Festival AutoPay - Required Previous Days', min: 0, max: 31 }
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

              {/* Modal Actions */}
              <div className="flex justify-end gap-3 pt-6 border-t">
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
        </div>
      )}
    </div>
  )
}

export default SalaryRules