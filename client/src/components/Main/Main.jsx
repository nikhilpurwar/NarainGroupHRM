import React from 'react'
import { Outlet } from 'react-router-dom'

const Main = () => {
  return (
    <main className="flex-1 w-full">
      <Outlet />
    </main>
  )
}

export default Main