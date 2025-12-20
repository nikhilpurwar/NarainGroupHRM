import React, { useEffect, useState } from 'react'
import { Search, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import axios from 'axios'
// import { Link, useNavigate } from 'react-router-dom'
import { FiEdit } from "react-icons/fi";
import { MdDeleteOutline } from "react-icons/md";

const DEFAULT_AVATAR = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="%23999" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>'

const EmployeeTable = ({
    employees = [],
    rowsPerPage = 8,
    onEdit = () => { },
    onDelete = () => { },
    onToggleStatus = () => { },
    onNameClick = () => { },
    renderActions, // optional custom action renderer (emp) => JSX
    showFilters = true,
    filtersOptions = {}, // { departments:[], subDepartments:[], groups:[] }
    loading = false,
}) => {
    const [filtered, setFiltered] = useState(employees || [])
    const [nameSearch, setNameSearch] = useState('')
    const [department, setDepartment] = useState('')
    const [subDepartment, setSubDepartment] = useState('')
    const [designation, setDesignation] = useState('')
    const [currentPage, setCurrentPage] = useState(1)

    // Schema options states
    const [departments, setDepartments] = useState([])
    const [subDepartments, setSubDepartments] = useState([])
    const [designations, setDesignations] = useState([])
    const [schemaLoading, setSchemaLoading] = useState(true)

    // Fetch all schema options from backend
    useEffect(() => {
        const fetchSchemaOptions = async () => {
            try {
                const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:5100'

                const [deptsRes, subDeptsRes, designationsRes] = await Promise.all([
                    axios.get(`${apiUrl}/api/department/head-departments`),
                    axios.get(`${apiUrl}/api/department/sub-departments`),
                    axios.get(`${apiUrl}/api/department/designations`)
                ])

                setDepartments(deptsRes.data.data || [])
                setSubDepartments(subDeptsRes.data.data || [])
                setDesignations(designationsRes.data.data || [])
                setSchemaLoading(false)
            } catch (error) {
                console.error('Error fetching schema options:', error)
                setSchemaLoading(false)
            }
        }

        fetchSchemaOptions()
    }, [])

    useEffect(() => setFiltered(employees || []), [employees])

    useEffect(() => {
        let temp = [...employees]
        if (nameSearch.trim()) {
            const search = nameSearch.toLowerCase()
            temp = temp.filter(e =>
                e.name?.toLowerCase().includes(search) ||
                e.empId?.toLowerCase().includes(search)
            )
        }
        if (department) temp = temp.filter(e => e.headDepartment?._id === department)
        if (subDepartment) temp = temp.filter(e => e.subDepartment?._id === subDepartment)
        if (designation) temp = temp.filter(e => e.designation?._id === designation)
        setFiltered(temp)
        setCurrentPage(1)
    }, [nameSearch, department, subDepartment, designation, employees])

    const [pageSize, setPageSize] = useState(rowsPerPage)

    const totalPages = Math.ceil(filtered.length / pageSize)
    const indexOfLast = currentPage * pageSize
    const indexOfFirst = indexOfLast - pageSize
    const currentData = filtered.slice(indexOfFirst, indexOfLast)

    const goNext = () => setCurrentPage(p => (p < totalPages ? p + 1 : p))
    const goPrev = () => setCurrentPage(p => (p > 1 ? p - 1 : p))

    const clearFilters = () => {
        setNameSearch('')
        setDepartment('')
        setSubDepartment('')
        setDesignation('')
        setCurrentPage(1)
    }


    return (
        <div>
            {showFilters && (
                <div className="bg-white p-5 rounded-b-xl shadow mb-6">
                    <div className="grid grid-cols-2 md:grid-cols-9 gap-4 mb-4">
                        <div className="relative col-span-2">
                            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Search by Name/Emp ID..."
                                className="w-full pl-10 pr-4 py-2 rounded-lg border focus:ring-2 focus:ring-indigo-500"
                                value={nameSearch}
                                onChange={e => setNameSearch(e.target.value)}
                            />
                        </div>

                        <select className="col-span-2 w-full border py-2 px-3 rounded-lg focus:ring-2 focus:ring-indigo-500" value={department} onChange={e => setDepartment(e.target.value)} disabled={schemaLoading}>
                            <option value="">Select Department</option>
                            {departments.map(d => (
                                <option key={d._id} value={d._id}>{d.name}</option>
                            ))}
                        </select>

                        <select className="col-span-2 w-full border py-2 px-3 rounded-lg focus:ring-2 focus:ring-indigo-500" value={subDepartment} onChange={e => setSubDepartment(e.target.value)} disabled={schemaLoading}>
                            <option value="">Select Sub Department</option>
                            {subDepartments.map(d => (
                                <option key={d._id} value={d._id}>{d.name}</option>
                            ))}
                        </select>

                        <select className="col-span-2 w-full border py-2 px-3 rounded-lg focus:ring-2 focus:ring-indigo-500" value={designation} onChange={e => setDesignation(e.target.value)} disabled={schemaLoading}>
                            <option value="">Select Designation</option>
                            {designations.map(d => (
                                <option key={d._id} value={d._id}>{d.name}</option>
                            ))}
                        </select>
                        <button
                            title='Clear Filters'
                            onClick={clearFilters}
                            className="flex items-center justify-center gap-2 w-full md:w-auto px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-medium transition"
                        >
                            <RotateCcw size={18} /><span>Clear</span>
                        </button>
                    </div>

                </div>
            )}

            <div className="bg-white py-4 rounded-xl shadow-md overflow-x-auto">
                {loading ? (
                    <p className="text-center py-6 text-gray-500">Loading employees...</p>
                ) : (
                    <table className="w-full table-auto">
                        <thead>
                            <tr className="bg-gray-100 text-gray-800 text-left">
                                <th className="px-4 py-3">#</th>
                                <th className="px-4 py-3">Emp ID</th>
                                <th className="px-4 py-3">Name</th>
                                <th className="px-4 py-3">Father Name</th>
                                <th className="px-4 py-3">Mobile</th>
                                <th className="px-4 py-3">Salary</th>
                                <th className="px-4 py-3">Department</th>
                                <th className="px-4 py-3">Sub Dept.</th>
                                <th className="px-4 py-3">Designation</th>
                                <th className="px-4 py-3">Status</th>
                                <th className="px-4 py-3 text-right">Action</th>
                            </tr>
                        </thead>

                        <tbody>
                            {currentData.length ? (
                                currentData.map((emp, i) => {
                                    const statusClass = emp.attendanceStatus === 'present' ? 'bg-green-100' : (emp.attendanceStatus === 'absent' ? 'bg-red-100' : '')
                                    return (
                                        <tr key={emp.id || emp._id} className={`border-b transition ${statusClass}`}>
                                            <td className="px-4 py-3">{indexOfFirst + i + 1}</td>
                                            <td
                                                onClick={(e) => { e.stopPropagation(); onNameClick(emp) }}
                                                className="px-4 py-3 cursor-pointer"
                                            >
                                                {emp.empId}
                                            </td>
                                            <td
                                                onClick={(e) => { e.stopPropagation(); onNameClick(emp) }}
                                                className="px-4 py-3 my-1 flex items-center gap-3 hover:bg-gray-200 hover:rounded-4xl cursor-pointer"
                                            >
                                                {emp.avatar ? (
                                                    <img
                                                        src={emp.avatar || DEFAULT_AVATAR}
                                                        alt="Profile"
                                                        className="w-10 h-10 rounded-full border"
                                                    />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-full border flex items-center justify-center bg-gray-300 text-gray-700 font-bold">
                                                        {emp.name
                                                            .split(" ")
                                                            .map((n) => n[0])
                                                            .join("")
                                                            .toUpperCase()}
                                                    </div>
                                                )}
                                                <span className="font-bold text-gray-900 text-left hover:underline cursor-pointer">
                                                    {emp.name}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">{emp.fatherName}</td>
                                            <td className="px-4 py-3">{emp.mobile}</td>
                                            <td className="px-4 py-3">₹{emp.salary}</td>
                                            <td className="px-4 py-3">{emp.headDepartment?.name || emp.headDepartment || ''}</td>
                                            <td className="px-4 py-3">{emp.subDepartment?.name || emp.subDepartment || ''}</td>
                                            <td className="px-4 py-3">{emp.designation?.name || emp.designation || ''}</td>
                                            <td className="px-4 py-3">
                                                <button onClick={(e) => { e.stopPropagation(); onToggleStatus(emp._id || emp.id, emp.status) }} className={`px-3 py-1 rounded-full text-sm ${emp.status === 'active' ? 'bg-green-200 text-green-600' : 'bg-red-100 text-red-600'}`} title={`Set ${emp.status === 'active' ? 'inactive' : 'active'}`}>{emp.status === 'active' ? 'Active' : 'Inactive'}</button>
                                            </td>
                                            <td className="text-center">
                                                {renderActions ? (<div className='flex justify-start items-center'>{renderActions(emp)}</div>) : (
                                                    <div className='flex justify-center items-center gap-3'>
                                                        <button onClick={(e) => { e.stopPropagation(); onEdit(emp) }} className="text-blue-600 hover:text-blue-800">
                                                            <FiEdit size={18} />
                                                        </button>
                                                        <button onClick={(e) => { e.stopPropagation(); onDelete(emp._id || emp.id) }} className="text-red-600 hover:text-red-800" title="Delete">
                                                            <MdDeleteOutline size={22} />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })
                            ) : (
                                <tr>
                                    <td colSpan="11" className="text-center py-6 text-gray-500">
                                        <div className="w-sm flex flex-col mx-auto items-center border-dashed border-2 border-gray-300 rounded-lg p-6 gap-4">
                                            No employees found
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}

                {filtered.length > 0 && (
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mt-6 pb- px-6">
                        <div className="flex items-center gap-4">
                            <div className="text-sm text-gray-600">Showing {filtered.length === 0 ? 0 : indexOfFirst + 1} to {Math.min(indexOfLast, filtered.length)} of {filtered.length}</div>

                            <label className="text-sm text-gray-600">Rows:</label>
                            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1); }} className="border rounded px-2 py-1">
                                {/* <option value={2}>2</option> */}
                                <option value={5}>5</option>
                                <option value={10}>10</option>
                                <option value={20}>20</option>
                                <option value={50}>50</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-3">
                            <button disabled={currentPage === 1} onClick={goPrev} className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 disabled:opacity-40"><ChevronLeft /></button>
                            <span className="font-medium">Page {currentPage} of {totalPages}</span>
                            <button disabled={currentPage === totalPages || totalPages === 0} onClick={goNext} className="p-2 rounded-lg bg-gray-200 hover:bg-gray-300 disabled:opacity-40"><ChevronRight /></button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default EmployeeTable
