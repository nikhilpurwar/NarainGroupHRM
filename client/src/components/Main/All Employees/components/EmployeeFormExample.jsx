import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { useHierarchy } from '../../../../context/HierarchyContext'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5100'

/**
 * Example Employee Form with Hierarchy Integration
 * Shows how to use the HierarchyContext for cascading dropdowns
 */
const EmployeeFormExample = ({ existingEmployee = null, onSave = () => {} }) => {
  const { headDepartments, getSubDepartmentsByHead, groups, getDesignationsByGroup } = useHierarchy()

  const [formData, setFormData] = useState({
    name: '',
    empId: '',
    email: '',
    mobile: '',
    headDepartment: '',
    subDepartment: '',
    group: '',
    designation: '',
    reportsTo: '',
    salary: 0,
    workHours: '8',
    // ... other fields
  })

  const [employees, setEmployees] = useState([])

  useEffect(() => {
    if (existingEmployee) {
      setFormData(existingEmployee)
    }
    fetchEmployees()
  }, [])

  const fetchEmployees = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/employees`)
      setEmployees(res.data?.data || [])
    } catch (err) {
      console.error('Failed to fetch employees:', err)
    }
  }

  const filteredSubDepts = formData.headDepartment
    ? getSubDepartmentsByHead(formData.headDepartment)
    : []

  const filteredDesignations = formData.group
    ? getDesignationsByGroup(formData.group)
    : []

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
      // Reset dependent fields when parent changes
      ...(field === 'headDepartment' && { subDepartment: '' }),
      ...(field === 'group' && { designation: '' }),
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const url = existingEmployee
        ? `${API_URL}/api/employees/${existingEmployee._id}`
        : `${API_URL}/api/employees`
      const method = existingEmployee ? 'PUT' : 'POST'

      const response = await axios({
        method,
        url,
        data: formData,
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      })

      onSave(response.data?.data)
      alert('Employee saved successfully!')
    } catch (err) {
      console.error('Failed to save employee:', err)
      alert(err.response?.data?.message || 'Failed to save employee')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto p-6 bg-white rounded shadow">
      <div className="grid grid-cols-2 gap-4">
        {/* Basic Info */}
        <div>
          <label className="block font-semibold mb-2">Name</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="block font-semibold mb-2">Employee ID</label>
          <input
            type="text"
            value={formData.empId}
            onChange={(e) => handleChange('empId', e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>

        {/* Head Department - Cascading */}
        <div>
          <label className="block font-semibold mb-2">Head Department *</label>
          <select
            value={formData.headDepartment}
            onChange={(e) => handleChange('headDepartment', e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          >
            <option value="">Select Head Department</option>
            {headDepartments.map((hd) => (
              <option key={hd._id} value={hd._id}>
                {hd.name} ({hd.code})
              </option>
            ))}
          </select>
        </div>

        {/* Sub Department - Filtered by Head Department */}
        <div>
          <label className="block font-semibold mb-2">Sub Department *</label>
          <select
            value={formData.subDepartment}
            onChange={(e) => handleChange('subDepartment', e.target.value)}
            className="w-full border rounded px-3 py-2"
            disabled={!formData.headDepartment}
            required
          >
            <option value="">Select Sub Department</option>
            {filteredSubDepts.map((sd) => (
              <option key={sd._id} value={sd._id}>
                {sd.name} ({sd.code})
              </option>
            ))}
          </select>
        </div>

        {/* Group */}
        <div>
          <label className="block font-semibold mb-2">Group *</label>
          <select
            value={formData.group}
            onChange={(e) => handleChange('group', e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          >
            <option value="">Select Group</option>
            {groups.map((g) => (
              <option key={g._id} value={g._id}>
                {g.name} - {g.section}
              </option>
            ))}
          </select>
        </div>

        {/* Designation - Filtered by Group */}
        <div>
          <label className="block font-semibold mb-2">Designation *</label>
          <select
            value={formData.designation}
            onChange={(e) => handleChange('designation', e.target.value)}
            className="w-full border rounded px-3 py-2"
            disabled={!formData.group}
            required
          >
            <option value="">Select Designation</option>
            {filteredDesignations.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name} ({d.code})
              </option>
            ))}
          </select>
        </div>

        {/* Reports To - Select from employees */}
        <div>
          <label className="block font-semibold mb-2">Reports To</label>
          <select
            value={formData.reportsTo}
            onChange={(e) => handleChange('reportsTo', e.target.value)}
            className="w-full border rounded px-3 py-2"
          >
            <option value="">No Manager</option>
            {employees
              .filter((e) => e._id !== existingEmployee?._id)
              .map((e) => (
                <option key={e._id} value={e._id}>
                  {e.name} - {e.designation?.name || 'N/A'}
                </option>
              ))}
          </select>
        </div>

        {/* Other fields */}
        <div>
          <label className="block font-semibold mb-2">Email</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block font-semibold mb-2">Mobile</label>
          <input
            type="text"
            value={formData.mobile}
            onChange={(e) => handleChange('mobile', e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block font-semibold mb-2">Salary</label>
          <input
            type="number"
            value={formData.salary}
            onChange={(e) => handleChange('salary', e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
        </div>

        <div>
          <label className="block font-semibold mb-2">Work Hours</label>
          <input
            type="number"
            value={formData.workHours}
            onChange={(e) => handleChange('workHours', e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
        </div>
      </div>

      <div className="flex gap-4">
        <button
          type="submit"
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700"
        >
          Save Employee
        </button>
      </div>
    </form>
  )
}

export default EmployeeFormExample
