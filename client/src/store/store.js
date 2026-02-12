import { configureStore } from '@reduxjs/toolkit'
import permissionsReducer from './permissionsSlice'
import employeesReducer from './employeesSlice'
import attendanceReducer from './attendanceSlice'
import loadingReducer from './loadingSlice'

export const store = configureStore({
  reducer: {
    permissions: permissionsReducer,
    employees: employeesReducer,
    attendance: attendanceReducer,
    loading : loadingReducer,
  }
})

export default store
