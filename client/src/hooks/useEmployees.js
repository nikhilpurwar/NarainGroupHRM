import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { useDispatch } from 'react-redux'
import { setEmployees } from '../store/employeesSlice'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5100'

export default function useEmployees(options = {}) {
  const dispatch = useDispatch()

  const fetchEmployees = async () => {
    const res = await axios.get(`${API_URL}/api/employees`)
    // backend often returns { data: [...] }
    return res.data?.data ?? res.data
  }

  const query = useQuery({
    queryKey: ['employees'],
    queryFn: fetchEmployees,
    staleTime: 60 * 1000,
    cacheTime: 5 * 60 * 1000,
    onSuccess: (data) => {
      // populate redux cache for components that read from store
      try {
        dispatch(setEmployees(data))
      } catch {}
    },
    ...options,
  })

  return query
}
