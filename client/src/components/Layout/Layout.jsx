import React, { useState } from 'react'
import { useLocation } from 'react-router-dom'
import Topbar from './components/Topbar'
import Sidebar from './components/Sidebar'
import Main from '../Main/Main'

const Layout = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true)
  const location = useLocation()

  const pageConfig = {
    dashboard: { path: '/dashboard', title: 'Dashboard', subtitle: 'Overview' },
    employees: { path: '/employees', title: 'All Employees', subtitle: 'List of employees' },
    addEmployee: { path: '/employee/add', title: 'Add Employee', subtitle: 'Manage employee details' },
    editEmployee: { path: '/employee/:id/edit', title: 'Edit Employee', subtitle: 'Manage employee details' },
    barcode: { path: '/barcode', title: 'Barcode', subtitle: 'Barcode of All Employees' },
    profile: { path: '/profile', title: 'Profile', subtitle: 'User Profile' },
    attReport: { path: '/attReport', title: 'Attendance', subtitle: 'Attendance report' },
    liveattend: { path: '/liveattend', title: 'Live Attendance', subtitle: 'Current attendance' },
    manageAdvance: { path: '/advance', title: 'Manage Advance', subtitle: 'Manage advance' },
    'emp-salary-report': { path: '/emp-salary-report', title: 'Monthly Salary', subtitle: 'Report' },
    'daily_report': { path: '/daily_report', title: 'Daily Salary', subtitle: 'Report' },
    'attendence-report': { path: '/attendence-report', title: 'Attendance Report', subtitle: 'Report' },
    departments: { path: '/departments', title: 'Head Departments', subtitle: 'Departments' },
    subdepartment: { path: '/subdepartment', title: 'Sub Departments', subtitle: 'Departments' },
    // group: { path: '/group', title: 'Group', subtitle: 'Departments' },
    designation: { path: '/designation', title: 'Designation', subtitle: 'Departments' },
    'user-list': { path: '/user-list', title: 'Manage Users', subtitle: 'Settings' },
    breaks: { path: '/breaks', title: 'Working Hours', subtitle: 'Settings' },
    festival: { path: '/festival', title: 'Holidays', subtitle: 'Settings' },
    charges: { path: '/charges', title: 'Charges', subtitle: 'Settings' },
  }

  const pathname = location.pathname
  const match = Object.values(pageConfig).find(
    cfg => pathname === cfg.path || pathname.startsWith(cfg.path)
  )

  const currentTopbar = match
    ? { title: match.title, subtitle: match.subtitle }
    : { title: 'Admin Panel', subtitle: '' }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-100">

      {/* Sidebar */}
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0">

        {/* Topbar */}
        <Topbar
          title={currentTopbar.title}
          subtitle={currentTopbar.subtitle}
          isSidebarCollapsed={isSidebarCollapsed}
          toggleSidebar={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        {/* Page Content */}
        <div className="flex flex-col flex-1 min-w-0 overflow-auto main-scroll">
          <Main />
        </div>

      </div>
    </div>
  )
}

export default Layout
