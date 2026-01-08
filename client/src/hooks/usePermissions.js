import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchPermissions } from '../store/permissionsSlice'

export default function usePermissions() {
  const dispatch = useDispatch()
  const { map, status } = useSelector(state => state.permissions || { map: null, status: 'idle' })

  useEffect(() => {
    if (!map && status !== 'loading') {
      // load permissions once when needed
      dispatch(fetchPermissions()).catch(() => {})
    }
  }, [map, status, dispatch])

  return { permissionsMap: map, status }
}
