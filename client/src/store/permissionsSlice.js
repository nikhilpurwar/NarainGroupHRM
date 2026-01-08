import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5100'

export const fetchPermissions = createAsyncThunk('permissions/fetch', async (_, { rejectWithValue }) => {
  try {
    const token = typeof window !== 'undefined' ? (sessionStorage.getItem('token') || localStorage.getItem('token')) : null
    const res = await fetch(`${API_URL}/api/permissions`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    })
    const data = await res.json()
    if (res.ok && data?.success && Array.isArray(data.data)) {
      const map = {}
      data.data.forEach(p => { map[p.route] = p.allowedRoles || [] })
      return map
    }
    return rejectWithValue('Failed to load permissions')
  } catch (e) {
    return rejectWithValue(e.message)
  }
})

const permissionsSlice = createSlice({
  name: 'permissions',
  initialState: {
    map: null,
    status: 'idle',
    error: null
  },
  reducers: {
    setPermissions(state, action) {
      state.map = action.payload
    }
  },
  extraReducers(builder) {
    builder
      .addCase(fetchPermissions.pending, (state) => {
        state.status = 'loading'
      })
      .addCase(fetchPermissions.fulfilled, (state, action) => {
        state.status = 'succeeded'
        state.map = action.payload
      })
      .addCase(fetchPermissions.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload || action.error.message
        state.map = {}
      })
  }
})

export const { setPermissions } = permissionsSlice.actions
export default permissionsSlice.reducer
