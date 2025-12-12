import React, { useState } from "react";
import { Link } from "react-router-dom";

const Sidebar = ({ onItemClick, isCollapsed }) => {
    const [isReportsOpen, setReportsOpen] = useState(false);
    const [isDeptOpen, setDeptOpen] = useState(false);
    const [isSettingsOpen, setSettingsOpen] = useState(false);

    const menuItems = [
        { id: "dashboard", icon: "fa-gauge", label: "Dashboard", title: "Dashboard" },
        { id: "employees", icon: "fa-user", label: "All Employees", title: "Employees" },
        { id: "attReport", icon: "fa-file-lines", label: "Attendance", title: "Attendance" },
        { id: "liveattend", icon: "fa-chart-line", label: "Live Attendance", title: "Live Attendance" },
        { id: "advance", icon: "fa-money-bill-wave", label: "Manage Advance", title: "Advance" },
    ];

    const handleItemClick = (item) => {
        onItemClick({
            title: item.title,
            subtitle: item.label,
        });
    };

    return (
        <div className={`${isCollapsed ? "w-20" : "w-64"} bg-gray-900 border-r border-gray-700 text-white transition-all duration-300 flex flex-col h-screen`}>

            {/* Logo Section */}
            <div className="h-20 flex items-center justify-center border-b border-gray-700 bg-white">
                <img
                    src={isCollapsed
                        ? "http://iudo.in/hrm/public/uploads/1759751401_favicon.jpg"
                        : "http://iudo.in/hrm/public/uploads/1759752543_logo.png"
                    }
                    alt="logo"
                    className={isCollapsed ? "h-18 w-18 object-contain" : "h-12 object-contain"}
                />
            </div>

            {/* Main Menu Items */}
            <nav className="flex-1 overflow-y-auto sidebar-scroll">
                <ul className="space-y-1 p-3">
                    {menuItems.map((item) => (
                        <li key={item.id}>
                            <Link
                                to={`/${item.id}`}
                                onClick={() => handleItemClick(item)}
                                className="flex items-center gap-3 px-3 py-3 rounded hover:bg-gray-800"
                            >
                                <i className={`fa-solid ${item.icon} text-lg`}></i>
                                {!isCollapsed && <span>{item.label}</span>}
                            </Link>
                        </li>
                    ))}
                </ul>

                {/* REPORTS DROPDOWN */}
                <div className="border-t border-gray-700 mt-3 pt-3">
                    <div
                        className="px-3 py-2 cursor-pointer flex items-center justify-between"
                        onClick={() => setReportsOpen(!isReportsOpen)}
                    >
                        {!isCollapsed && <p className="text-sm font-semibold">Reports</p>}
                        {!isCollapsed && (
                            <i className={`fa-solid fa-chevron-${isReportsOpen ? "down" : "right"}`}></i>
                        )}
                    </div>

                    {isReportsOpen && !isCollapsed && (
                        <ul className="space-y-1 mt-2 pl-6">
                            <li>
                                <Link
                                    to="/emp-salary-report"
                                    onClick={() =>
                                        onItemClick({
                                            title: "Reports",
                                            subtitle: "Monthly Salary Report",
                                        })
                                    }
                                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-800 text-sm"
                                >
                                    <i className="fa-solid fa-file"></i> Monthly Salary
                                </Link>
                            </li>

                            <li>
                                <Link
                                    to="/daily_report"
                                    onClick={() =>
                                        onItemClick({
                                            title: "Reports",
                                            subtitle: "Daily Salary Report",
                                        })
                                    }
                                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-800 text-sm"
                                >
                                    <i className="fa-solid fa-file"></i> Daily Salary
                                </Link>
                            </li>

                            <li>
                                <Link
                                    to="/attendence-report"
                                    onClick={() =>
                                        onItemClick({
                                            title: "Reports",
                                            subtitle: "Attendance Report",
                                        })
                                    }
                                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-800 text-sm"
                                >
                                    <i className="fa-solid fa-file"></i> Attendance
                                </Link>
                            </li>
                        </ul>
                    )}
                </div>


                {/* DEPARTMENTS DROPDOWN */}
                <div className="border-t border-gray-700 mt-3 pt-3">
                    <div
                        className="px-3 py-2 cursor-pointer flex items-center justify-between"
                        onClick={() => setDeptOpen(!isDeptOpen)}
                    >
                        {!isCollapsed && <p className="text-sm font-semibold">Departments</p>}
                        {!isCollapsed && (
                            <i className={`fa-solid fa-chevron-${isDeptOpen ? "down" : "right"}`}></i>
                        )}
                    </div>

                    {isDeptOpen && !isCollapsed && (
                        <ul className="space-y-1 mt-2 pl-6">
                            <li>
                                <Link
                                    to="/departments"
                                    onClick={() =>
                                        onItemClick({
                                            title: "Departments",
                                            subtitle: "Head Departments",
                                        })
                                    }
                                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-800 text-sm">
                                    <i className="fa-solid fa-building"></i> Head Departments
                                </Link>
                            </li>
                            <li>
                                <Link
                                    to="/subdepartment"
                                    onClick={() =>
                                        onItemClick({
                                            title: "Departments",
                                            subtitle: "Sub Departments",
                                        })
                                    }
                                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-800 text-sm">
                                    <i className="fa-solid fa-building"></i> Sub Departments
                                </Link>
                            </li>
                        </ul>
                    )}
                </div>

                {/* SETTINGS DROPDOWN */}
                <div className="border-t border-gray-700 mt-3 pt-3">
                    <div
                        className="px-3 py-2 cursor-pointer flex items-center justify-between"
                        onClick={() => setSettingsOpen(!isSettingsOpen)}
                    >
                        {!isCollapsed && <p className="text-sm font-semibold">Settings</p>}
                        {!isCollapsed && (
                            <i className={`fa-solid fa-chevron-${isSettingsOpen ? "down" : "right"}`}></i>
                        )}
                    </div>

                    {isSettingsOpen && !isCollapsed && (
                        <ul className="space-y-1 mt-2 pl-6">
                            <li>
                                <Link
                                    to="/user-list"
                                    onClick={() =>
                                        onItemClick({
                                            title: "Settings",
                                            subtitle: "Manage Users",
                                        })
                                    }
                                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-800 text-sm">
                                    <i className="fa-solid fa-user"></i> Manage Users
                                </Link>
                            </li>
                            <li>
                                <Link
                                    to="/breaks"
                                    onClick={() =>
                                        onItemClick({
                                            title: "Settings",
                                            subtitle: "Working Hours",
                                        })
                                    }
                                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-800 text-sm">
                                    <i className="fa-solid fa-clock"></i> Working Hours
                                </Link>
                            </li>
                            <li>
                                <Link
                                    to="/festival"
                                    onClick={() =>
                                        onItemClick({
                                            title: "Settings",
                                            subtitle: "Holidays",
                                        })
                                    }
                                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-800 text-sm">
                                    <i className="fa-solid fa-gift"></i> Holidays
                                </Link>
                            </li>
                            <li>
                                <Link
                                    to="/charges"
                                    onClick={() =>
                                        onItemClick({
                                            title: "Settings",
                                            subtitle: "Charges",
                                        })
                                    }
                                    className="flex items-center gap-3 px-3 py-2 hover:bg-gray-800 text-sm">
                                    <i className="fa-solid fa-money-bill-wave"></i> Charges
                                </Link>
                            </li>
                        </ul>
                    )}
                </div>
            </nav>

            {/* Logout */}
            <div className="border-t border-gray-700 p-3">
                <Link to="/logout" className="flex items-center gap-3 px-3 py-3 hover:bg-red-600">
                    <i className="fa-solid fa-arrow-right-from-bracket"></i>
                    {!isCollapsed && <span>Logout</span>}
                </Link>
            </div>
        </div>
    );
};

export default Sidebar;
