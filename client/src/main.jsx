import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import axios from 'axios'

// Set axios auth header from saved token if present (sessionStorage preferred)
let token = null
try {
  token = sessionStorage.getItem('token') || localStorage.getItem('token')
} catch {
  token = null
}
if (token) axios.defaults.headers.common['Authorization'] = `Bearer ${token}`

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
