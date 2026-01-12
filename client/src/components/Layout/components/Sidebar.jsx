import React, { useState, useEffect, useMemo } from "react"
import { NavLink, useNavigate, useLocation } from "react-router-dom"
import axios from "axios"
import usePermissions from '../../../hooks/usePermissions'

const Sidebar = ({ isCollapsed, toggleSidebar }) => {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5100'
  const { permissionsMap: permissions } = usePermissions()
  const [open, setOpen] = useState({
    reports: false,
    dept: false,
    settings: false,
  })
  const [isHovered, setHovered] = useState(false)

  const effectiveCollapsed = Boolean(isCollapsed) && !isHovered
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // On small screens we treat `collapsed` as closed — don't render the slim sidebar
  // (decision to actually hide will be applied after all hooks are declared)

  const navigate = useNavigate()
  const location = useLocation()

  const storedUser =
    typeof window !== "undefined"
      ? JSON.parse(
        sessionStorage.getItem("user") ||
        localStorage.getItem("user") ||
        "null"
      )
      : null

  const role = storedUser?.role
  const roleNormalized = (role || '').toString().toLowerCase()
  // permissions read from Redux store (with window fallback)

  /* ---------------- MENU CONFIG ---------------- */

  const mainMenu = useMemo(() => {
    if (roleNormalized === "gate") {
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

  // Apply permissions filter if available
  const filterByPermissions = (items) => {
    // if permissions not loaded yet, show items optimistically so navigation is instant.
    // Actual access will be enforced by `ProtectedRoute` after permissions load.
    if (!permissions) return items
    // Admin sees everything (case-insensitive)
    if (roleNormalized === 'admin') return items
    return items.filter(item => {
      const allowed = permissions[item.path]
      // If no restriction defined for this route, hide it for non-admins
      if (allowed === undefined) return false
      // If allowedRoles is empty array, hide it
      if (Array.isArray(allowed) && allowed.length === 0) return false
      // Otherwise check if user's role is in allowedRoles (case-insensitive)
      if (Array.isArray(allowed)) {
        const allowedLower = allowed.map(a => (a || '').toString().toLowerCase())
        return allowedLower.includes(roleNormalized)
      }
      return false
    })
  }

  const visibleMainMenu = filterByPermissions(mainMenu)

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
    { path: "/breaks", label: "Working Hours" },
    { path: "/festival", label: "Holidays" },
    { path: "/charges", label: "Charges" },
    { path: "/user-list", label: "Manage Users" },
    { path: "/permissions", label: "Permissions" },
    { path: "/salary-rules", label: "Salary Rules" },
  ]

  const visibleReportsMenu = filterByPermissions(reportsMenu)
  const visibleDeptMenu = filterByPermissions(deptMenu)
  const visibleSettingsMenu = filterByPermissions(settingsMenu)

  // permissions are provided by the central store via usePermissions()

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
    try {
      // Clear tokens and user details from both storages
      localStorage.removeItem("token")
      localStorage.removeItem("user")
      sessionStorage.removeItem("token")
      sessionStorage.removeItem("user")
      try { delete axios.defaults.headers.common["Authorization"] } catch { }
      navigate("/login")
    } catch (e) {
      console.error(e)
    }
  }

  /* ---------------- RENDER ---------------- */

  const shouldOverlay = !effectiveCollapsed && isMobile

  // Hide collapsed sidebar on mobile: return null after all hooks have run
  if (isMobile && Boolean(isCollapsed)) return null

  return (
    <>
      {/* Backdrop for mobile when sidebar is open */}
      {shouldOverlay && (
        <div className="fixed inset-0 bg-black/40 z-40" onClick={() => toggleSidebar && toggleSidebar()} />
      )}

      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={`${effectiveCollapsed ? "w-auto md:w-21" : "md:w-64"} bg-gray-900 border-r border-gray-700 text-white transition-all duration-300 flex flex-col h-screen ${shouldOverlay ? 'absolute left-0 top-0 z-50' : 'shrink-0'}`}
      >
        {/* LOGO */}
        <div className="h-20 flex items-center justify-center border-b border-gray-700 bg-white">
          <img
            src={effectiveCollapsed ? "/logo1.png" : "/logo2.png"}
            alt="logo"
            className={effectiveCollapsed ? "w-14 object-contain" : "h-12 object-contain"}
          />
        </div>

        {/* MENU */}
        <nav className="flex-1 overflow-y-auto sidebar-scroll pb-4">
          <ul className="space-y-1 p-2.5 md:p-4">
            {visibleMainMenu.map(item => (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  onClick={() => { if (isMobile && toggleSidebar) toggleSidebar() }}
                  className={({ isActive }) =>
                    `${baseLink} ${effectiveCollapsed ? "justify-center" : ""} ${isActive ? activeLink : inactiveLink}`
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
            items={visibleReportsMenu}
          />

          <Dropdown
            title="Departments"
            icon="fa-building"
            open={open.dept}
            toggle={() => setOpen(o => ({ ...o, dept: !o.dept }))}
            collapsed={effectiveCollapsed}
            items={visibleDeptMenu}
          />

          <Dropdown
            title="Settings"
            icon="fa-cog"
            open={open.settings}
            toggle={() => setOpen(o => ({ ...o, settings: !o.settings }))}
            collapsed={effectiveCollapsed}
            items={visibleSettingsMenu}
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
    </>
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
