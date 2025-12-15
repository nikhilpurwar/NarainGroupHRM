import React from 'react'
import { Outlet } from 'react-router-dom'

const Main = () => {
  return (
    <main className="flex-1 overflow-auto bg-gray-50 sidebar-scroll">
      <Outlet />
    </main>
  )
}

export default Main