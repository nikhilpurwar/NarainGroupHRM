import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5100'

export const fetchEmployees = createAsyncThunk('employees/fetch', async (_, { rejectWithValue }) => {
  try {
    const token = typeof window !== 'undefined' ? (sessionStorage.getItem('token') || localStorage.getItem('token')) : null
    const res = await fetch(`${API_URL}/api/employees`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    })
    const data = await res.json()
    if (!res.ok) return rejectWithValue(data?.message || 'Failed to fetch')
    return data.data || []
  } catch (e) {
    return rejectWithValue(e.message)
  }
})

const employeesSlice = createSlice({
  name: 'employees',
  initialState: {
    data: [],
    status: 'idle',
    error: null,
    lastFetched: null
  },
  reducers: {
    setEmployees(state, action) {
      state.data = action.payload
      state.lastFetched = Date.now()
      state.status = 'succeeded'
    }
  },
  extraReducers(builder) {
    builder
      .addCase(fetchEmployees.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(fetchEmployees.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.data = action.payload
        state.lastFetched = Date.now()
      })
      .addCase(fetchEmployees.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || action.error.message
      })
  }
})

export const { setEmployees } = employeesSlice.actions

// Thunk to ensure cached employees: only fetch if not fetched recently
export const ensureEmployees = () => (dispatch, getState) => {
  const { employees } = getState()
  const staleMs = 60 * 1000 // 60 seconds
  if (employees.lastFetched && (Date.now() - employees.lastFetched) < staleMs) {
    return Promise.resolve()
  }
  return dispatch(fetchEmployees())
}

export default employeesSlice.reducer
