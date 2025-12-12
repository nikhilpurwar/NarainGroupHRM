import React from 'react'
import { Outlet } from 'react-router-dom'

const Main = () => {
  return (
    <main className="flex-1 p-6 overflow-auto bg-gray-50">
      <Outlet />
    </main>
  )
}

export default Main