import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5100'

export const fetchTodayAttendance = createAsyncThunk('attendance/fetchToday', async (_, { rejectWithValue }) => {
  try {
    const token = typeof window !== 'undefined' ? (sessionStorage.getItem('token') || localStorage.getItem('token')) : null
    const res = await fetch(`${API_URL}/api/attendance-report/today`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    })
    const data = await res.json()
    if (!res.ok) return rejectWithValue(data?.message || 'Failed')
    return data.data || {}
  } catch (e) {
    return rejectWithValue(e.message)
  }
})

const attendanceSlice = createSlice({
  name: 'attendance',
  initialState: {
    attendanceIso: null,
    map: {},
    raw: [],
    status: 'idle',
    error: null,
    lastFetched: null
  },
  reducers: {
    setAttendance(state, action) {
      const payload = action.payload || {}
      state.attendanceIso = payload.attendanceIso || null
      state.map = payload.map || {}
      state.raw = payload.attendances || []
      state.lastFetched = Date.now()
      state.status = 'succeeded'
    }
    ,updateAttendanceEntry(state, action) {
      const { employeeId, attendance } = action.payload || {}
      if (!employeeId) return
      state.map = { ...(state.map || {}), [employeeId]: attendance }
      // also update raw array for consistency (replace or push)
      const idx = (state.raw || []).findIndex(a => (a && ((a.employee && a.employee.toString && a.employee.toString()) || a.employee) === employeeId))
      if (idx >= 0) {
        state.raw[idx] = attendance
      } else {
        state.raw = [...(state.raw || []), attendance]
      }
    }
  },
  extraReducers(builder) {
    builder
      .addCase(fetchTodayAttendance.pending, (state) => { state.status = 'loading' })
      .addCase(fetchTodayAttendance.fulfilled, (state, action) => {
        const payload = action.payload || {}
        state.attendanceIso = payload.attendanceIso || null
        state.map = payload.map || {}
        state.raw = payload.attendances || []
        state.status = 'succeeded'
        state.lastFetched = Date.now()
      })
      .addCase(fetchTodayAttendance.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || action.error.message
      })
  }
})

export const { setAttendance, updateAttendanceEntry } = attendanceSlice.actions

export const ensureTodayAttendance = () => (dispatch, getState) => {
  const { attendance } = getState()
  const staleMs = 15 * 1000 // 15 seconds for live
  if (attendance.lastFetched && (Date.now() - attendance.lastFetched) < staleMs) return Promise.resolve()
  return dispatch(fetchTodayAttendance())
}

export default attendanceSlice.reducer
