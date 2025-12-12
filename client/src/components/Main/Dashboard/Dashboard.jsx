import React from 'react'
import Cards from './components/Cards';
import EmployeeAttendance from './components/EmployeeAttendance';
import FestivalList from './components/FestivalList';

const Dashboard = () => {

  const CardData1 = [
    { title: 'Employees', value: '105', icon: 'fa-users' },
    { title: 'Absent', value: '104', icon: 'fa-user-xmark' },
  ];

  const CardData2 = [
    { title: 'OFFICE STAFF', present: '0', absent: '15', icon: 'fa-user-tie' },
    { title: 'PLANT SECTION', present: '1', absent: '69', icon: 'fa-industry' },
    { title: 'FINISH LABOUR', present: '0', absent: '21', icon: 'fa-boxes-packing' },
  ];

  return (
    <div className='flex flex-col gap-6'>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4">
        {CardData1.map((card, index) => {
          return (
            <div className='flex justify-between items-center bg-gray-200 shadow-md p-4 rounded-lg'>
              <div className="flex items-center justify-center w-16 h-16 bg-gray-300 rounded-full">
                <i className={`fas ${card.icon} text-2xl text-gray-700`}></i>
              </div>
              <div className='flex flex-col gap-2'>
                <div className='font-bold'>
                  {card.value}
                </div>
                <div>
                  {card.title}
                </div>
              </div>
            </div>
          )
        })}
        <div className="flex gap-4 items-center bg-gray-200 shadow-md p-4 rounded-lg">
          <div className="flex items-center justify-center w-16 h-16 bg-gray-300 rounded-full">
            <i className="fas fa-user-check text-2xl text-gray-700"></i>
          </div>

          <div className="flex flex-col gap-4 flex-1">
            <div className="flex justify-between">
              <span className="text-gray-700">Total Present</span>
              <span className="font-bold">105</span>
            </div>

            <div className="flex justify-between">
              <span className="font-bold">IN: <p className='inline-block text-green-500'>0</p></span>
              <span className="font-bold">OUT: <p className='inline-block text-red-600'>1</p></span>
            </div>
          </div>
        </div>

        {CardData2.map((card, index) => (
          <Cards
            key={index}
            title={card.title}
            icon={card.icon}
            present={card.present}
            absent={card.absent}
          />
        ))}
      </div>
      <EmployeeAttendance />
      <FestivalList />
    </div>
  )
}

export default Dashboard