import React from "react";
import {
  FaUsers,
  FaUserCheck,
  FaUserTimes,
  FaBuilding,

} from "react-icons/fa"; 
import { GiOpenGate } from "react-icons/gi";
import {IoMdLogOut } from "react-icons/io";

const Cards = ({ data }) => {
  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-6">

        {/* EMPLOYEES */}
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 rounded-xl p-5 shadow-sm card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-indigo-700">
                Employees
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {data.totalEmployees}
              </p>

              <div className="flex gap-4 mt-3 text-xs">
                <span className="flex items-center gap-1 text-green-700 font-medium">
                  <FaUserCheck /> Active: {data.activeEmployees}
                </span>
                <span className="flex items-center gap-1 text-gray-600 font-medium">
                  <FaUserTimes /> Inactive: {data.inactiveEmployees}
                </span>
              </div>
            </div>

            <div className="bg-white p-3 rounded-lg shadow text-indigo-600">
              <FaUsers size={22} />
            </div>
          </div>
        </div>

        {/* MONTHLY PRESENT */}
        <KpiCard
          title="Monthly Present"
          value={data.monthlyPresent}
          icon={<FaUserCheck size={20} />}
          gradient="from-green-50 to-green-100"
          border="green-200"
          text="text-green-700"
        />

        {/* MONTHLY ABSENT */}
        <KpiCard
          title="Monthly Absent"
          value={data.monthlyAbsent}
          icon={<FaUserTimes size={20} />}
          gradient="from-red-50 to-red-100"
          border="red-200"
          text="text-red-700"
        />

        {/* TODAY MOVEMENT */}
<KpiCard
  title="Today Movement"
  value={
    <div className="mt-2 grid grid-cols-2 gap-x-10 gap-y-5 text-sm font-semibold text-gray-700">

      <span>
        Present: <span className="font-bold">{data.presentToday}</span>
      </span>

      <span>
        Absent: <span className="font-bold">{data.absentToday}</span>
      </span>

      <span className="flex items-center gap-1 text-green-700">
        <IoMdLogOut className="rotate-180" size={20} />
        <span className="font-bold">{data.inEmployees}</span>
      </span>

      <span className="flex items-center gap-1 text-red-600">
        <IoMdLogOut size={20} />
        <span className="font-bold">{data.outEmployees}</span>
      </span>
    </div>
  }
  icon={<GiOpenGate size={20} />}
  gradient="from-sky-50 to-sky-100"
  text="text-sky-700"
/>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-6">
        {data.departments?.map((dept) => (
          <div
            key={dept._id}
            className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-xl p-4 shadow-sm card-hover"
          >
            <div className=" flex items-center justify-between mb-4">
              <div>
                <p className="text-sm font-semibold text-slate-600">
                  Department
                </p>
                <h3 className="text-xl font-bold text-sky-700">
                  {dept.name}
                </h3>
              </div>

              <div className="bg-white p-3 rounded-lg shadow text-sky-600">
                <FaBuilding size={20} />
              </div>
            </div>

            <p className="text-sm font-medium text-gray-700 mb-3">
              Total Employees:{" "}
              <span className="font-bold text-gray-900">
                {dept.totalEmployees}
              </span>
            </p>

            <div className="flex justify-between text-sm font-semibold">
              <span className="text-green-600">
                Present: {dept.present}
              </span>
              <span className="text-red-600">
                Absent: {dept.absent}
              </span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

/* ================= REUSABLE KPI CARD ================= */
const KpiCard = ({ title, value, icon, gradient, text,border }) => {
  return (
    <div className={`bg-gradient-to-br ${gradient} border${border} rounded-xl p-5 shadow-sm card-hover `}>
      <div className="h-full flex items-center justify-between ">
        <div className="flex flex-col justify-start items-start">
          <p className={`text-sm font-semibold ${text} `}>
            {title}
          </p>
          <div className="text-3xl font-bold text-gray-900 mt-1 ">
            {value}
          </div>
        </div>
        <div className="bg-white p-3 rounded-lg shadow align-middle">
          <span className={text}>{icon}</span>
        </div>
      </div>
    </div>
  );
};
export default Cards;
