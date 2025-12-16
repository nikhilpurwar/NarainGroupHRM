// import { useState } from 'react'
import './App.css'
import { Routes, Route, Navigate } from 'react-router-dom'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import Login from './components/Login'
import SignUp from './components/SignUp'
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
import ManageUsers from './components/Main/Settings/Manage Users/ManageUsers'
import WorkingHours from './components/Main/Settings/Working Hours/WorkingHours'
import Holidays from './components/Main/Settings/Holidays/Holidays'
import Charges from './components/Main/Settings/Charges/Charges'
import AddEditEmployee from './components/Main/All Employees/components/AddEditEmployee'

function App() {
  return (
    <>
      <ToastContainer position="top-right" autoClose={3000} />
      <Routes>
        <Route path="/login" element={<Login />}></Route>
        <Route path="/signup" element={<SignUp />}></Route>
        <Route path="/" element={<Layout />}>
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

          <Route path="/departments" element={<HeadDepartments />} />
          <Route path="/subdepartment" element={<SubDepartments />} />

          <Route path="/user-list" element={<ManageUsers />} />
          <Route path="/breaks" element={<WorkingHours />} />
          <Route path="/festival" element={<Holidays />} />
          <Route path="/charges" element={<Charges />} />

          {/* fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </>
  )
}

export default App
