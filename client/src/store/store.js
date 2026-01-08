import { configureStore } from '@reduxjs/toolkit'
import permissionsReducer from './permissionsSlice'
import employeesReducer from './employeesSlice'
import attendanceReducer from './attendanceSlice'

export const store = configureStore({
  reducer: {
    permissions: permissionsReducer,
    employees: employeesReducer,
    attendance: attendanceReducer
  }
})

export default store
