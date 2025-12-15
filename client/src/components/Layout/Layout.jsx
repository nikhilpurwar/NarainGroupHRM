import React, { useState } from 'react'
import { useLocation } from 'react-router-dom'
import Topbar from './components/Topbar'
import Sidebar from './components/Sidebar'
import Main from '../Main/Main'

const pageConfig = {
  dashboard: { path: '/dashboard', title: 'Dashboard', subtitle: 'Overview' },
  employees: { path: '/employees', title: 'All Employees', subtitle: 'List of employees' },
  addEmployee: { path: '/employee/add', title: 'Add Employee', subtitle: 'Manage employee details' },
  editEmployee: { path: '/employee/:id/edit', title: 'Edit Employee', subtitle: 'Manage employee details' },
  attReport: { path: '/attReport', title: 'Attendance', subtitle: 'Attendance report' },
  liveattend: { path: '/liveattend', title: 'Live Attendance', subtitle: 'Current attendance' },
  manageAdvance: { path: '/advance', title: 'Manage Advance', subtitle: 'Manage advance' },
  'emp-salary-report': { path: '/emp-salary-report', title: 'Monthly Salary', subtitle: 'Report' },
  'daily_report': { path: '/daily_report', title: 'Daily Salary', subtitle: 'Report' },
  'attendence-report': { path: '/attendence-report', title: 'Attendance Report', subtitle: 'Report' },
  departments: { path: '/departments', title: 'Head Departments', subtitle: 'Departments' },
  subdepartment: { path: '/subdepartment', title: 'Sub Departments', subtitle: 'Departments' },
  'user-list': { path: '/user-list', title: 'Manage Users', subtitle: 'Settings' },
  breaks: { path: '/breaks', title: 'Working Hours', subtitle: 'Settings' },
  festival: { path: '/festival', title: 'Holidays', subtitle: 'Settings' },
  charges: { path: '/charges', title: 'Charges', subtitle: 'Settings' },
}

const Layout = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const location = useLocation();
  const pathname = location?.pathname || '';
  const match = Object.values(pageConfig).find(cfg => pathname === cfg.path || pathname.startsWith(cfg.path));
  const currentTopbar = match ? { title: match.title, subtitle: match.subtitle } : { title: 'Admin Panel', subtitle: '' };

  const handleSidebarClick = () => {
    // no-op: topbar derived from current route (location)
  };

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className='flex bg-gray-100 h-screen overflow-hidden'>
      <Sidebar 
        onItemClick={handleSidebarClick}
        isCollapsed={isSidebarCollapsed}
        toggleSidebar={toggleSidebar}
      />
      <div className={`flex flex-col flex-1 transition-all duration-300 ${isSidebarCollapsed ? 'ml-0' : 'ml-0'}`}>
        <Topbar 
          title={currentTopbar.title}
          subtitle={currentTopbar.subtitle}
          isSidebarCollapsed={isSidebarCollapsed}
          toggleSidebar={toggleSidebar}
        />
        <Main />
      </div>
    </div>
  )
}

export default Layout