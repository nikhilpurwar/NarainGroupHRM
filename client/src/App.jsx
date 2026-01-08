// import { useState } from 'react'
import './App.css'
import { useEffect } from 'react'
import { useDispatch } from 'react-redux'
import { fetchPermissions } from './store/permissionsSlice'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'

import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'

import { HierarchyProvider } from './context/HierarchyContext'
import Login from './components/Auth/Login'
import SignUp from './components/Auth/SignUp'
import ProtectedRoute from './components/Auth/ProtectedRoute'
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
import Permissions from './components/Main/Settings/Permissions/Permissions'
import AddEditEmployee from './components/Main/All Employees/components/AddEditEmployee'

function App() {
  const dispatch = useDispatch()

  useEffect(() => {
    // load permissions once at app startup
    dispatch(fetchPermissions()).catch(() => {})
  }, [dispatch])
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
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/employees" element={<ProtectedRoute><AllEmployees /></ProtectedRoute>} />
            <Route path="/employee/add" element={<ProtectedRoute><AddEditEmployee /></ProtectedRoute>} />
            <Route path="/employee/:id/edit" element={<ProtectedRoute><AddEditEmployee /></ProtectedRoute>} />
            <Route path="/profile/:id" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/barcodes" element={<ProtectedRoute><Barcodes /></ProtectedRoute>} />
            <Route path="/attReport" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
            <Route path="/liveattend" element={<ProtectedRoute><LiveAttendance /></ProtectedRoute>} />
            <Route path="/advance" element={<ProtectedRoute><ManageAdvance /></ProtectedRoute>} />

            <Route path="/emp-salary-report" element={<ProtectedRoute><MonthlySalary /></ProtectedRoute>} />
            <Route path="/daily_report" element={<ProtectedRoute><DailySalary /></ProtectedRoute>} />
            <Route path="/attendence-report" element={<ProtectedRoute><ReportsAttendance /></ProtectedRoute>} />

            {/* Department & Designations */}
            <Route path="/departments" element={<ProtectedRoute><HeadDepartments /></ProtectedRoute>} />
            <Route path="/subdepartment" element={<ProtectedRoute><SubDepartments /></ProtectedRoute>} />
            {/* <Route path="/group" element={<ProtectedRoute><Groups /></ProtectedRoute>} /> */}
            <Route path="/designation" element={<ProtectedRoute><Designations /></ProtectedRoute>} />

            {/* Settings */}
            <Route path="/user-list" element={<ProtectedRoute requiredRoles={['Admin']}><ManageUsers /></ProtectedRoute>} />
            <Route path="/breaks" element={<ProtectedRoute><WorkingHours /></ProtectedRoute>} />
            <Route path="/festival" element={<ProtectedRoute><Holidays /></ProtectedRoute>} />
            <Route path="/charges" element={<ProtectedRoute><Charges /></ProtectedRoute>} />
            <Route path="/salary-rules" element={<ProtectedRoute><SalaryRules /></ProtectedRoute>} />
            <Route path="/permissions" element={<ProtectedRoute requiredRoles={['Admin']}><Permissions /></ProtectedRoute>} />

            {/* fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </Router>
    </HierarchyProvider>
  )
}

export default App
