import React, { useState, useEffect, useMemo } from "react"
import { NavLink, useNavigate, useLocation } from "react-router-dom"

const Sidebar = ({ isCollapsed }) => {
  const [open, setOpen] = useState({
    reports: false,
    dept: false,
    settings: false,
  })
  const [isHovered, setHovered] = useState(false)

  const effectiveCollapsed = Boolean(isCollapsed) && !isHovered

  const navigate = useNavigate()
  const location = useLocation()

  const storedUser =
    typeof window !== "undefined"
      ? JSON.parse(localStorage.getItem("user") || "null")
      : null

  const role = storedUser?.role

  /* ---------------- MENU CONFIG ---------------- */

  const mainMenu = useMemo(() => {
    if (role === "gate") {
      return [
        { path: "/attReport", icon: "fa-file-lines", label: "Attendance" },
        { path: "/liveattend", icon: "fa-chart-line", label: "Live Attendance" },
      ]
    }
    return [
      { path: "/dashboard", icon: "fa-gauge", label: "Dashboard" },
      { path: "/employees", icon: "fa-user", label: "All Employees" },
      { path: "/attReport", icon: "fa-file-lines", label: "Attendance" },
      { path: "/liveattend", icon: "fa-chart-line", label: "Live Attendance" },
      { path: "/advance", icon: "fa-money-bill-wave", label: "Manage Advance" },
    ]
  }, [role])

  const reportsMenu = [
    { path: "/emp-salary-report", label: "Monthly Salary" },
    { path: "/daily_report", label: "Daily Salary" },
    { path: "/attendence-report", label: "Attendance" },
  ]

  const deptMenu = [
    { path: "/departments", label: "Head Departments" },
    { path: "/subdepartment", label: "Sub Departments" },
    { path: "/designation", label: "Designation" },
  ]

  const settingsMenu = [
    { path: "/user-list", label: "Manage Users" },
    { path: "/breaks", label: "Working Hours" },
    { path: "/festival", label: "Holidays" },
    { path: "/charges", label: "Charges" },
    { path: "/salary-rules", label: "Salary Rules" },
  ]

  /* ---------------- AUTO OPEN DROPDOWNS ---------------- */

  useEffect(() => {
    const p = location.pathname

    setOpen({
      reports: reportsMenu.some(m => p.startsWith(m.path)),
      dept: deptMenu.some(m => p.startsWith(m.path)),
      settings: settingsMenu.some(m => p.startsWith(m.path)),
    })
  }, [location.pathname])

  /* ---------------- STYLES ---------------- */

  const baseLink = "flex items-center gap-3 px-3 py-3 rounded transition-colors"
  const activeLink = "bg-gray-800 text-white"
  const inactiveLink = "text-gray-300 hover:bg-gray-800"

  /* ---------------- LOGOUT ---------------- */

  const doLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    navigate("/login")
  }

  /* ---------------- RENDER ---------------- */

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`${effectiveCollapsed ? "w-20" : "w-64"} bg-gray-900 border-r border-gray-700 text-white transition-all duration-300 flex flex-col h-screen shrink-0`}
    >
      {/* LOGO */}
      <div className="h-20 flex items-center justify-center border-b border-gray-700 bg-white">
        <img
          src={effectiveCollapsed ? "/logo1.png" : "/logo2.png"}
          alt="logo"
          className={effectiveCollapsed ? "h-16 w-16 object-contain" : "h-12 object-contain"}
        />
      </div>

      {/* MENU */}
      <nav className="flex-1 overflow-y-auto sidebar-scroll pb-4">
        <ul className="space-y-1 p-3">
          {mainMenu.map(item => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                className={({ isActive }) =>
                  `${baseLink} ${effectiveCollapsed ? "justify-center px-0" : ""} ${isActive ? activeLink : inactiveLink}`
                }
              >
                <i className={`fa-solid ${item.icon} text-lg`} />
                {!effectiveCollapsed && <span className="text-sm">{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>

        <Dropdown
          title="Reports"
          icon="fa-file"
          open={open.reports}
          toggle={() => setOpen(o => ({ ...o, reports: !o.reports }))}
          collapsed={effectiveCollapsed}
          items={reportsMenu}
        />

        <Dropdown
          title="Departments"
          icon="fa-building"
          open={open.dept}
          toggle={() => setOpen(o => ({ ...o, dept: !o.dept }))}
          collapsed={effectiveCollapsed}
          items={deptMenu}
        />

        <Dropdown
          title="Settings"
          icon="fa-cog"
          open={open.settings}
          toggle={() => setOpen(o => ({ ...o, settings: !o.settings }))}
          collapsed={effectiveCollapsed}
          items={settingsMenu}
        />
      </nav>

      {/* LOGOUT */}
      <div className="border-t border-gray-700 p-3">
        <button
          onClick={doLogout}
          className="w-full flex items-center gap-3 px-3 py-3 hover:bg-red-600 rounded"
        >
          <i className="fa-solid fa-arrow-right-from-bracket" />
          {!effectiveCollapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  )
}

/* ---------------- DROPDOWN COMPONENT ---------------- */

const Dropdown = ({ title, icon, open, toggle, collapsed, items }) => {
  const baseLink = "flex items-center gap-3 px-3 py-2 rounded transition-colors"
  const activeLink = "bg-gray-800 text-white"
  const inactiveLink = "text-gray-300 hover:bg-gray-800"

  return (
    <div className="border-t border-gray-700 mt-3 pt-3">
      <div
        onClick={toggle}
        className={`px-3 py-2 cursor-pointer flex items-center ${collapsed ? "justify-center" : "justify-between"}`}
      >
        {!collapsed && <p className="text-sm font-semibold">{title}</p>}
        {!collapsed && <i className={`fa-solid fa-chevron-${open ? "down" : "right"}`} />}
        {collapsed && <i className={`fa-solid ${icon} text-lg`} />}
      </div>

      {open && !collapsed && (
        <ul className="space-y-1 mt-2 pl-6">
          {items.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `${baseLink} text-sm ${isActive ? activeLink : inactiveLink}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </ul>
      )}
    </div>
  )
}

export default Sidebar
