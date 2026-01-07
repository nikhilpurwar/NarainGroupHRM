import React from 'react'

const Cards = ({ title, icon, present, absent }) => {
  return (
    <div className='card-hover flex flex-col gap-2 bg-gray-200 shadow-md p-4 rounded-lg'>
      <div className='flex justify-between'>
        <div className="flex items-center justify-center w-16 h-16 bg-gray-300 rounded-full">
          <i className={`fas ${icon} text-2xl text-gray-700`}></i>
        </div>
        <div className='flex flex-col gap-2 text-right'>
          <div className="font-bold">
            {Number(present) + Number(absent)} (<span className="text-green-500">{present}</span> | <span className="text-red-600">{absent}</span>)
          </div>

          <div>{title}</div>
        </div>
      </div>
      <div className='flex justify-between font-bold'>
        <div className='flex gap-2'>P:
          <span className='text-green-500'>{present}</span>
        </div>
        <div className='flex gap-2'>A:
          <span className='text-red-600'>{absent}</span>
        </div>
      </div>
    </div>
  )
}

export default Cards