// import { useState } from 'react'
import './App.css'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'

import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

import { HierarchyProvider } from './context/HierarchyContext'
import Login from './components/Auth/Login'
import SignUp from './components/Auth/SignUp'
// import ChangePassword from './components/Auth/ChangePassword'
import Layout from './components/Layout/Layout'
import Dashboard from './components/Main/Dashboard/Dashboard'
import AllEmployees from './components/Main/All Employees/AllEmployees'
import Profile from './components/Main/All Employees/components/Profile'
import Barcodes from './components/Main/All Employees/components/Barcodes'
import Attendance from './components/Main/Attendance/Attendance'
import LiveAttendance from './components/Main/Live Attendance/LiveAttendance'
import ManageAdvance from './components/Main/Manage Advance/ManageAdvance'
import MonthlySalary from './components/Main/Reports/Monthly Salary/MonthlySalary'
import DailySalary from './components/Main/Reports/Daily Salary/DailySalary'
import ReportsAttendance from './components/Main/Reports/Attendance/Attendance'
import HeadDepartments from './components/Main/Departments/Head Departments/HeadDepartments'
import SubDepartments from './components/Main/Departments/Sub Departments/SubDepartments'
// import Groups from './components/Main/Departments/Group/Group'
import Designations from './components/Main/Departments/Designation/Designation'
import ManageUsers from './components/Main/Settings/Manage Users/ManageUsers'
import WorkingHours from './components/Main/Settings/Working Hours/WorkingHours'
import Holidays from './components/Main/Settings/Holidays/Holidays'
import Charges from './components/Main/Settings/Charges/Charges'
import SalaryRules from './components/Main/Settings/Salary Rules/SalaryRules'
import AddEditEmployee from './components/Main/All Employees/components/AddEditEmployee'

function App() {
  const RequireAuth = ({ children }) => {
    if (typeof window === 'undefined') return children

    let token = null
    try {
      const sessionToken = sessionStorage.getItem('token')
      const expiresAt = sessionStorage.getItem('expiresAt')
      if (sessionToken) {
        if (expiresAt && Date.now() > Number(expiresAt)) {
          // session expired - clear session storage
          sessionStorage.removeItem('token')
          sessionStorage.removeItem('user')
          sessionStorage.removeItem('expiresAt')
        } else {
          token = sessionToken
        }
      }
      if (!token) {
        token = localStorage.getItem('token')
      }
    } catch {
      token = null
    }

    if (!token) return <Navigate to="/login" replace />
    return children
  }

  const RequireGuest = ({ children }) => {
    if (typeof window === 'undefined') return children

    let token = null
    try {
      const sessionToken = sessionStorage.getItem('token')
      const expiresAt = sessionStorage.getItem('expiresAt')
      if (sessionToken) {
        if (expiresAt && Date.now() > Number(expiresAt)) {
          // expired - clear session storage so guest can see login
          sessionStorage.removeItem('token')
          sessionStorage.removeItem('user')
          sessionStorage.removeItem('expiresAt')
        } else {
          token = sessionToken
        }
      }
      if (!token) {
        token = localStorage.getItem('token')
      }
    } catch {
      token = null
    }

    if (token) return <Navigate to="/" replace />
    return children
  }

  return (
    <HierarchyProvider>
      <Router>
        <ToastContainer position="top-right" autoClose={3000} />
        <Routes>
          <Route path="/login" element={<RequireGuest><Login /></RequireGuest>}></Route>
          <Route path="/signup" element={<RequireGuest><SignUp /></RequireGuest>}></Route>
          {/* <Route path="/change-password" element={<ChangePassword />}></Route> */}
          <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/employees" element={<AllEmployees />} />
            <Route path="/employee/add" element={<AddEditEmployee />} />
            <Route path="/employee/:id/edit" element={<AddEditEmployee />} />
            <Route path="/profile/:id" element={<Profile />} />
            <Route path="/barcodes" element={<Barcodes />} />
            <Route path="/attReport" element={<Attendance />} />
            <Route path="/liveattend" element={<LiveAttendance />} />
            <Route path="/advance" element={<ManageAdvance />} />

            <Route path="/emp-salary-report" element={<MonthlySalary />} />
            <Route path="/daily_report" element={<DailySalary />} />
            <Route path="/attendence-report" element={<ReportsAttendance />} />

            {/* Department & Designations */}
            <Route path="/departments" element={<HeadDepartments />} />
            <Route path="/subdepartment" element={<SubDepartments />} />
            {/* <Route path="/group" element={<Groups />} /> */}
            <Route path="/designation" element={<Designations />} />

            {/* Settings */}
            <Route path="/user-list" element={<ManageUsers />} />
            <Route path="/breaks" element={<WorkingHours />} />
            <Route path="/festival" element={<Holidays />} />
            <Route path="/charges" element={<Charges />} />
            <Route path="/salary-rules" element={<SalaryRules />} />

            {/* fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </Router>
    </HierarchyProvider>
  )
}

export default App
