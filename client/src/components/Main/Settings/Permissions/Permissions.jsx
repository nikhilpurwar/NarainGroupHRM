import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useDispatch } from 'react-redux'
import { fetchPermissions as fetchPermissionsThunk } from '../../../../store/permissionsSlice'
import { toast } from 'react-toastify'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5100'

// Icons for different routes
import {
    FiUsers, FiClock, FiEye , FiCalendar,
    FiFileText, FiLayers, FiFolder, FiTag, FiUser, FiSettings,
    FiSun, FiStar, FiCreditCard, FiCheckCircle
} from 'react-icons/fi'
import {
    HiOutlineLockOpen, HiOutlineLockClosed,
    HiOutlineCheck, HiOutlineX
} from 'react-icons/hi'
import { FaSearch, FaRupeeSign, FaMoneyBillWave } from "react-icons/fa";
import { FaChartLine, FaFileLines, FaUser, FaGauge } from "react-icons/fa6";
import { GiOpenGate } from "react-icons/gi";

const knownRoutes = [
    { path: '/dashboard', label: 'Dashboard', icon: FaGauge, color: 'bg-blue-100 text-blue-600' },
    { path: '/employees', label: 'All Employees', icon: FaUser, color: 'bg-purple-100 text-purple-600' },
    { path: '/attReport', label: 'Attendance', icon: FaFileLines, color: 'bg-green-100 text-green-600' },
    { path: '/liveattend', label: 'Live Attendance', icon: FaChartLine, color: 'bg-red-100 text-red-600' },
    { path: '/advance', label: 'Manage Advance', icon: FaMoneyBillWave , color: 'bg-yellow-100 text-yellow-600' },
    { path: '/emp-salary-report', label: 'Monthly Salary', icon: FiCalendar, color: 'bg-indigo-100 text-indigo-600' },
    { path: '/daily_report', label: 'Daily Salary', icon: FiFileText, color: 'bg-pink-100 text-pink-600' },
    { path: '/attendence-report', label: 'Attendance Report', icon: FiLayers, color: 'bg-teal-100 text-teal-600' },
    { path: '/departments', label: 'Head Departments', icon: FiFolder, color: 'bg-orange-100 text-orange-600' },
    { path: '/subdepartment', label: 'Sub Departments', icon: FiTag, color: 'bg-cyan-100 text-cyan-600' },
    { path: '/designation', label: 'Designation', icon: FiUser, color: 'bg-gray-100 text-gray-600' },
    { path: '/user-list', label: 'Manage Users', icon: FiUsers, color: 'bg-lime-100 text-lime-600' },
    { path: '/breaks', label: 'Working Hours', icon: FiClock, color: 'bg-rose-100 text-rose-600' },
    { path: '/festival', label: 'Holidays', icon: FiStar, color: 'bg-amber-100 text-amber-600' },
    { path: '/charges', label: 'Charges', icon: FiCreditCard, color: 'bg-emerald-100 text-emerald-600' },
    { path: '/salary-rules', label: 'Salary Rules', icon: FiSettings, color: 'bg-violet-100 text-violet-600' },
]

const DEFAULT_ROLES = [
    { id: 'account', name: 'account', icon: FaRupeeSign, color: 'bg-green-500 text-white' },
    { id: 'gate', name: 'gate', icon: GiOpenGate, color: 'bg-purple-500 text-white' }
]

const Permissions = () => {
    const [perms, setPerms] = useState([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedRoles, setSelectedRoles] = useState([])
    const [bulkUpdating, setBulkUpdating] = useState(false)

    // Dynamic roles loaded from users collection with sensible defaults
    const [allRoles, setAllRoles] = useState(DEFAULT_ROLES)

    useEffect(() => {
        const loadRoles = async () => {
            try {
                const res = await axios.get(`${API_URL}/api/users`)
                const users = res.data?.data || []
                const roles = Array.from(new Set(users.map(u => u.role).filter(Boolean)))

                const roleIconMap = {
                    admin: FiCheckCircle,
                    account: FaRupeeSign,
                    gate: GiOpenGate
                }
                const roleColorMap = {
                    admin: 'bg-blue-500 text-white',
                    account: 'bg-green-500 text-white',
                    gate: 'bg-purple-500 text-white'
                }

                const roleObjs = roles.map(r => ({
                    id: r,
                    name: r,
                    icon: roleIconMap[r] || FiUser,
                    color: roleColorMap[r] || 'bg-gray-600 text-white'
                }))

                setAllRoles(roleObjs.length ? roleObjs : DEFAULT_ROLES)
            } catch (e) {
                console.error('Failed to load roles:', e)
                setAllRoles(DEFAULT_ROLES)
            }
        }

        loadRoles()
    }, [])

    const storedUser = typeof window !== 'undefined' ? JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || 'null') : null
    const role = storedUser?.role
    const roleNormalized = (role || '').toString().toLowerCase()

    // Authorization check with better UI
    // if (role !== 'Admin') {
    //     return (
    //         <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
    //             <div className="text-center p-8 bg-white rounded-2xl shadow-xl max-w-md">
    //                 <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-red-100 flex items-center justify-center">
    //                     <HiOutlineLockClosed className="w-10 h-10 text-red-600" />
    //                 </div>
    //                 <h2 className="text-2xl font-bold text-gray-800 mb-3">Access Denied</h2>
    //                 <p className="text-gray-600 mb-6">
    //                     You don't have permission to view this page. Only administrators can access permission settings.
    //                 </p>
    //                 <button
    //                     onClick={() => window.history.back()}
    //                     className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
    //                 >
    //                     Go Back
    //                 </button>
    //             </div>
    //         </div>
    //     )
    // }

    

    const dispatch = useDispatch()

    useEffect(() => {
        // dispatch redux thunk to populate central permissions map
        dispatch(fetchPermissionsThunk()).catch(() => {})
        // also load local array for this page
        loadPermissions()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const loadPermissions = async () => {
        setLoading(true)
        try {
            const res = await axios.get(`${API_URL}/api/permissions`)
            if (res.data?.success) {
                setPerms(res.data.data || [])
            }
        } catch (e) {
            console.error('Fetch error:', e)
            toast.error('Failed to load permissions')
        } finally {
            setLoading(false)
        }
    }

    const getAllowed = (path) => {
        const p = perms.find(x => x.route === path)
        return p ? p.allowedRoles || [] : []
    }

const toggleRole = async (path, role) => {
  try {
    const existing = perms.find(x => x.route === path)

    let allowed = existing?.allowedRoles || []

    if (allowed.includes(role)) {
      allowed = allowed.filter(r => r !== role)
    } else {
      allowed = [...allowed, role]
    }

    const routeInfo = knownRoutes.find(r => r.path === path)

    const payload = {
      route: path,
      label: routeInfo?.label || path,
      allowedRoles: allowed
    }

    const res = await axios.post(`${API_URL}/api/permissions`, payload)

    if (!res.data?.success) throw new Error()

    // 🔥 Update UI locally — NO refresh
    setPerms(prev =>
      prev.some(p => p.route === path)
        ? prev.map(p =>
            p.route === path ? { ...p, allowedRoles: allowed } : p
          )
        : [...prev, payload]
    )

    toast.success("Permission updated")

  } catch (e) {
    toast.error("Failed to update permission")
  }
}


    const toggleAllForRole = async (role) => {
        setBulkUpdating(true)
        try {
            const updates = knownRoutes.map(async (rt) => {
                const allowed = selectedRoles.includes(role)
                    ? getAllowed(rt.path).filter(r => r !== role)
                    : [...getAllowed(rt.path), role]

                const payload = {
                    route: rt.path,
                    label: rt.label,
                    allowedRoles: allowed
                }

                return axios.post(`${API_URL}/api/permissions`, payload)
            })

            await Promise.all(updates)
            toast.success(`✓ ${selectedRoles.includes(role) ? 'Removed' : 'Granted'} ${role} access to all routes`)
            setPerms(prev =>
  knownRoutes.map(rt => {
    const allowed = selectedRoles.includes(role)
      ? getAllowed(rt.path).filter(r => r !== role)
      : [...new Set([...getAllowed(rt.path), role])]

    return {
      route: rt.path,
      label: rt.label,
      allowedRoles: allowed
    }
  })
)

        } catch (e) {
            console.error('Bulk update error:', e)
            toast.error('Failed to update permissions')
        } finally {
            setBulkUpdating(false)
        }
    }

    const filteredRoutes = knownRoutes.filter(route =>
        route.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        route.path.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <p className="text-gray-600">Loading permissions...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Route Permissions</h1>
                            <p className="text-gray-600 mt-2">Manage access controls for different user roles</p>
                        </div>
                        <div className="flex items-center gap-4">
                            <button
                                onClick={loadPermissions}
                                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2"
                            >
                                <FiRefreshCw className="w-4 h-4" />
                                Refresh
                            </button>
                        </div>
                    </div>

                    {/* Stats Summary */}
                    <div className="mb-8 grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="card-hover bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Total Routes</p>
                                    <p className="text-2xl font-bold text-gray-900">{knownRoutes.length}</p>
                                </div>
                                <FiLayers className="w-8 h-8 text-blue-500" />
                            </div>
                        </div>

                        <div className="card-hover bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Admin Access</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                                                {knownRoutes.filter(r => getAllowed(r.path).map(x => (x||'').toString().toLowerCase()).includes('admin')).length}
                                    </p>
                                </div>
                                <FiUsers className="w-8 h-8 text-purple-500" />
                            </div>
                        </div>

                        <div className="card-hover bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Account Access</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {knownRoutes.filter(r => getAllowed(r.path).map(x => (x||'').toString().toLowerCase()).includes('account')).length}
                                    </p>
                                </div>
                                <FaRupeeSign  className="w-8 h-8 text-green-500" />
                            </div>
                        </div>

                        <div className="card-hover bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-gray-600">Gate Access</p>
                                    <p className="text-2xl font-bold text-gray-900">
                                        {knownRoutes.filter(r => getAllowed(r.path).map(x => (x||'').toString().toLowerCase()).includes('gate')).length}
                                    </p>
                                </div>
                                <GiOpenGate className="w-8 h-8 text-orange-500" />
                            </div>
                        </div>
                    </div>

                    {/* Search and Filters */}
                    <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="relative">
                                <FaSearch size={22} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search routes or labels..."
                                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <div className="col-span-2 flex items-center gap-2">
                                <span className="text-gray-700 font-medium">Quick Actions:</span>
                                {allRoles.map(roleItem => (
                                    <button
                                        key={roleItem.id}
                                        onClick={() => toggleAllForRole(roleItem.id)}
                                        disabled={bulkUpdating}
                                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${selectedRoles.includes(roleItem.id)
                                                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                                                : 'bg-green-100 text-green-700 hover:bg-green-200'
                                            }`}
                                    >
                                        {selectedRoles.includes(roleItem.id) ? (
                                            <>
                                                <HiOutlineX className="w-4 h-4" />
                                                Remove {roleItem.name} from All
                                            </>
                                        ) : (
                                            <>
                                                <HiOutlineCheck className="w-4 h-4" />
                                                Grant {roleItem.name} to All
                                            </>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Permissions Table */}
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-4 p-6 bg-gray-50 border-b border-gray-200">
                        <div className="col-span-4 md:col-span-3">
                            <h3 className="font-semibold text-gray-700">Route & Label</h3>
                        </div>
                        <div className="col-span-8 md:col-span-9">
                            <div className="grid grid-cols-3 gap-4">
                                {allRoles.map(roleItem => (
                                    <div key={roleItem.id} className="text-center">
                                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full ${roleItem.color}`}>
                                            <roleItem.icon className="w-4 h-4" />
                                            <span className="font-semibold">{roleItem.name}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Routes List */}
                    <div className="divide-y divide-gray-100">
                        {filteredRoutes.map(route => {
                            const Icon = route.icon
                            const allowedRoles = getAllowed(route.path)

                            return (
                                <div key={route.path} className="grid grid-cols-12 gap-4 p-6 hover:bg-gray-50 transition-colors">
                                    {/* Route Info */}
                                    <div className="col-span-4 md:col-span-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-lg ${route.color} flex items-center justify-center`}>
                                                <Icon className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="font-medium text-gray-900">{route.label}</h4>
                                                <p className="text-sm text-gray-500 font-mono mt-1">{route.path}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Permissions Toggles */}
                                    <div className="col-span-8 md:col-span-9">
                                        <div className="grid grid-cols-3 gap-4">
                                            {allRoles.map(roleItem => {
                                                const isAllowed = (allowedRoles || []).map(a => (a||'').toString().toLowerCase()).includes((roleItem.id||'').toString().toLowerCase())
                                                return (
                                                    <div key={roleItem.id} className="text-center">
                                                        <button
                                                            onClick={() => toggleRole(route.path, roleItem.id)}
                                                            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg transition-all ${isAllowed
                                                                    ? 'bg-green-50 text-green-700 hover:bg-green-100 border border-green-200'
                                                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
                                                                }`}
                                                        >
                                                            {isAllowed ? (
                                                                <>
                                                                    <HiOutlineLockOpen className="w-5 h-5" />
                                                                    <span className="font-medium">Allowed</span>
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <HiOutlineLockClosed className="w-5 h-5" />
                                                                    <span className="font-medium">Denied</span>
                                                                </>
                                                            )}
                                                        </button>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Legend */}
                <div className="mt-8 bg-white rounded-xl p-6 shadow-sm border border-gray-200">
                    <h3 className="font-semibold text-gray-800 mb-4">Permission Legend</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-4 h-4 rounded bg-green-100 border border-green-200"></div>
                            <span className="text-sm text-gray-700">Allowed Access</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-4 h-4 rounded bg-gray-100 border border-gray-200"></div>
                            <span className="text-sm text-gray-700">Access Denied</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-4 h-4 rounded bg-blue-100 border border-blue-200"></div>
                            <span className="text-sm text-gray-700">Route Icon & Color</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Permissions

// Add missing icon component
// const FiSearch = ({ className }) => (
//     <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
//         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
//     </svg>
// )

const FiRefreshCw = ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
    </svg>
)