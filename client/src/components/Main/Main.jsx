import React from 'react'
import { Outlet } from 'react-router-dom'

const Main = () => {
  return (
    <main className="flex-1 h-full overflow-hidden bg-gray-50">
      <div className="w-full h-full overflow-y-auto main-scroll">
        <Outlet />
      </div>
    </main>
  )
}

export default Main