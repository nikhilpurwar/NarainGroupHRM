import React, { useState, useEffect, useRef } from "react";
import { CgMenuLeft } from "react-icons/cg";
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { FaUserAlt, FaCaretDown, FaCaretUp } from "react-icons/fa";
import ChangePassword from "../../Auth/ChangePassword";

const Topbar = ({ title, subtitle, isSidebarCollapsed, toggleSidebar }) => {
    const [open, setOpen] = useState(false);
    const [userName, setUserName] = useState("");
    const [userEmail, setUserEmail] = useState("");
    const [userRole, setUserRole] = useState("");
    const [avatarUrl, setAvatarUrl] = useState("");
    const [employeeId, setEmployeeId] = useState("");
    const [showChangePassword, setShowChangePassword] = useState(false);
    const [greeting, setGreeting] = useState("");
    const dropdownRef = useRef(null);

    const navigate = useNavigate()

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5100'

    // Role-based styling
    const getRoleStyle = (role) => {
        const roleStyles = {
            'admin': {
                bg: 'bg-gradient-to-r from-red-700 to-indigo-900',
                text: 'text-white',
                badge: 'bg-red-700',
                border: 'border-red-600'
            },
            'account': {
                bg: 'bg-gradient-to-r from-blue-700 to-indigo-900',
                text: 'text-white',
                badge: 'bg-blue-700',
                border: 'border-blue-600'
            },
            'gate': {
                bg: 'bg-gradient-to-r from-green-700 to-indigo-900',
                text: 'text-white',
                badge: 'bg-green-700',
                border: 'border-green-600'
            },
            'hr': {
                bg: 'bg-gradient-to-r from-purple-700 to-indigo-900',
                text: 'text-white',
                badge: 'bg-purple-700',
                border: 'border-purple-600'
            }
        }

        return roleStyles[role] || {
            bg: 'bg-gradient-to-r from-gray-700 to-indigo-900',
            text: 'text-white',
            badge: 'bg-gray-700',
            border: 'border-gray-600'
        }
    }

    useEffect(() => {
        try {
            if (typeof window === 'undefined') return
            const stored = sessionStorage.getItem('user') || localStorage.getItem('user')
            if (stored) {
                const parsed = JSON.parse(stored)
                setUserName(parsed?.name || "")
                setUserEmail(parsed?.email || "")
                setUserRole(parsed?.role || "")
            }
        } catch (e) {
            console.error('Failed to read user from storage', e)
        }
    }, [])

    useEffect(() => {
        const fetchEmployeeAvatar = async () => {
            if (!userEmail) return
            try {
                const token = typeof window !== 'undefined'
                    ? (sessionStorage.getItem('token') || localStorage.getItem('token'))
                    : null
                const res = await fetch(`${API_URL}/api/employees`, {
                    headers: {
                        'Content-Type': 'application/json',
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                    },
                })
                const data = await res.json()
                if (!res.ok || !data?.success) return

                const employees = Array.isArray(data.data) ? data.data : []
                const emp = employees.find(e => e.empId === userEmail || e.email === userEmail)
                if (emp) {
                    setEmployeeId(emp._id || "")
                    if (emp.avatar) {
                        setAvatarUrl(emp.avatar)
                    }
                }
            } catch (e) {
                console.error('Failed to fetch employee avatar', e)
            }
        }

        fetchEmployeeAvatar()
    }, [API_URL, userEmail])

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [])

    const doLogout = () => {
        try {
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            sessionStorage.removeItem('token')
            sessionStorage.removeItem('user')
            try { delete axios.defaults.headers.common['Authorization'] } catch { }
            navigate('/login')
        } catch (e) { console.error(e) }
    }

    const getGreetingByTime = () => {
        const hour = new Date().getHours();

        if (hour >= 5 && hour < 12) return { key: 'morning', text: 'Good Morning' };
        if (hour >= 12 && hour < 17) return { key: 'noon', text: 'Good Afternoon' };
        return { key: 'evening', text: 'Good Evening' };
    };

    useEffect(() => {
        if (!userName) return;

        const { key, text } = getGreetingByTime();
        const sessionKey = `greeted_${key}`;

        // already greeted in this time slot
        if (sessionStorage.getItem(sessionKey)) return;

        const firstName = userName.split(" ")[0];
        setGreeting(`${text}, ${firstName} Sir`);

        sessionStorage.setItem(sessionKey, 'true');

        // auto hide greeting after 6 seconds
        const timer = setTimeout(() => setGreeting(""), 6000);
        return () => clearTimeout(timer);
    }, [userName]);



    return (
        <div className="w-full bg-gray-900 text-white border-b shadow-sm">
            <div className="w-full min-h-20 flex justify-between items-center pr-6 py-3">
                {/* Left side with title and toggle */}
                <div className="flex items-center gap-8">
                    <button
                        onClick={toggleSidebar}
                        className="p-2 rounded transition"
                        title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                    >
                        <CgMenuLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-white">{title}</h1>
                        {subtitle && (
                            <p className="text-sm text-gray-400 mt-1">{subtitle}</p>
                        )}
                    </div>
                </div>

                {/* Center Greeting */}
                <div className="absolute left-1/2 transform -translate-x-1/2">
                    {greeting && (
                        <div className="px-6 py-2 rounded-xl
            bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600
            text-white font-extrabold text-lg tracking-wide
            shadow-[0_10px_30px_rgba(0,0,0,0.6)]
            animate-fadeInUp
            transform-gpu
            hover:scale-105
            transition-all duration-300
            [text-shadow:2px_2px_6px_rgba(0,0,0,0.6)]
        ">
                            {greeting}
                        </div>
                    )}
                </div>

                {/* Right side with user menu */}
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setOpen(!open)}
                        className="flex items-center pl-4 pr-2 py-2 rounded-full gap-3 border border-gray-700 bg-gradient-to-r from-gray-800 via-gray-900 to-black shadow-lg shadow-black/40 hover:shadow-xl hover:-translate-y-0.5 hover:from-gray-900 hover:to-indigo-800 transition-transform transition-shadow duration-150"
                    >
                        <span>
                            {open ? <FaCaretUp size={16} className="text-white" /> : <FaCaretDown size={16} className="text-white" />}
                        </span>
                        {userName && (
                            <span className="mr-2 text-md font-bold text-white drop-shadow-sm hidden sm:inline">
                                {userName}
                            </span>
                        )}
                        <span className="relative w-10 h-10 rounded-full overflow-hidden border border-gray-500 flex items-center justify-center bg-gradient-to-br from-gray-700 via-gray-900 to-black shadow-inner">
                            {avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt={userName || 'User'}
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <FaUserAlt className="text-gray-200 text-lg" />
                            )}
                            {/* <span className="absolute bottom-0 right-0  w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span> */}
                        </span>

                    </button>

                    {/* Dropdown menu */}
                    {open && (
                        <div className="absolute right-0.5 top-15.5 w-52 bg-white rounded-xl shadow-2xl ring-1 ring-black/10 z-50 transform origin-top-right animate-dropdown">
                            <div className="">
                                {userRole && (
                                    <span className={`block w-full text-left px-4 py-2 text-sm font-semibold ${getRoleStyle(userRole).text} ${getRoleStyle(userRole).bg} rounded-t-xl`}>
                                        Role: {userRole}
                                    </span>
                                )}
                                <button
                                    onClick={() => {
                                        if (employeeId) {
                                            setOpen(false);
                                            navigate(`/profile/${employeeId}`);
                                        }
                                    }}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                                    disabled={!employeeId}
                                >
                                    My Profile
                                </button>
                                <button
                                    onClick={() => { setOpen(false); setShowChangePassword(true); }}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-200"
                                >
                                    Change Password
                                </button>
                                <button
                                    onClick={doLogout}
                                    className="block w-full text-left px-4 py-2 pb-3 text-sm text-red-600 hover:bg-red-100 hover:rounded-b-xl"
                                >
                                    Logout
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <ChangePassword
                isOpen={showChangePassword}
                onClose={() => setShowChangePassword(false)}
                initialEmail={userEmail}
            />
        </div>
    );
};

export default Topbar;