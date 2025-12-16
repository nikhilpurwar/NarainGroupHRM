import React, { useState } from "react";
import { CgMenuLeft } from "react-icons/cg";
import { useNavigate } from 'react-router-dom'

const Topbar = ({ title, subtitle, isSidebarCollapsed, toggleSidebar }) => {
    const [open, setOpen] = useState(false);

    const navigate = useNavigate()

    const doLogout = () => {
        try {
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            try { window.axios && (window.axios.defaults.headers.common.Authorization = '') } catch {}
            navigate('/login')
        } catch (e) { console.error(e) }
    }

    return (
        <div className="bg-gray-900 text-white border-b shadow-sm">
            <div className="min-h-20 flex justify-between items-center pr-6 py-3">
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

                {/* Right side with user menu */}
                <div className="relative">
                    <button
                        onClick={() => setOpen(!open)}
                        className="flex items-center focus:outline-none"
                    >
                        <span className="relative w-10 h-10 rounded-full overflow-hidden borde border-gray-300">
                            <img
                                src="http://iudo.in/hrm/public/uploads/1759752557_profile.jpg"
                                alt="User"
                                className="w-full h-full object-cover"
                            />
                            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white"></span>
                        </span>
                    </button>

                    {/* Dropdown menu */}
                    {open && (
                        <div className="absolute right-0 top-14 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                            <div className="py-1">
                                <a
                                    href="http://iudo.in/hrm/user-profile/1"
                                    className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                    My Profile
                                </a>
                                <button
                                    onClick={doLogout}
                                    className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                                >
                                    Logout
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Topbar;