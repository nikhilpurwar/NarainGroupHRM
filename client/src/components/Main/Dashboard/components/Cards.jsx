import React from "react";
import {
  FaUsers,
  FaUserCheck,
  FaUserTimes,
  FaBuilding,

} from "react-icons/fa";
import { GiOpenGate } from "react-icons/gi";
import { IoMdLogOut } from "react-icons/io";
import { useNavigate } from "react-router-dom";

const Skeleton = ({ className = "" }) => (
  <div
    className={`animate-pulse bg-gray-200/70 rounded ${className}`}
  />
);

const Cards = ({ data = {}, loading }) => {
  const navigate = useNavigate();

  return (
    <>
      {/* TOP KPI GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">

        {/* EMPLOYEES */}
        <div
          onClick={() => !loading && navigate("/employees")}
          className="bg-gradient-to-br from-indigo-50 to-indigo-100 border border-indigo-200 rounded-2xl p-5 shadow-sm card-hover"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-indigo-700">
                Employees
              </p>

              {loading ? (
                <Skeleton className="h-9 w-20 mt-2" />
              ) : (
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {data.totalEmployees}
                </p>
              )}

              <div className="flex gap-4 mt-3 text-xs">
                {loading ? (
                  <>
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-20" />
                  </>
                ) : (
                  <>
                    <span className="flex items-center gap-1 text-green-700 font-medium">
                      <FaUserCheck /> Active: {data.activeEmployees}
                    </span>
                    <span className="flex items-center gap-1 text-gray-600 font-medium">
                      <FaUserTimes /> Inactive: {data.inactiveEmployees}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="bg-white p-3 rounded-lg shadow text-indigo-600">
              <FaUsers size={22} />
            </div>
          </div>
        </div>

        <KpiCard
          title="Monthly Present"
          value={data.monthlyPresent}
          icon={<FaUserCheck size={20} />}
          gradient="from-green-50 to-green-100"
          border="border-green-200"
          text="text-green-700"
          loading={loading}
          onClick={() => navigate("/attendance-report")}
        />

        <KpiCard
          title="Monthly Absent"
          value={data.monthlyAbsent}
          icon={<FaUserTimes size={20} />}
          gradient="from-red-50 to-red-100"
          border="border-red-200"
          text="text-red-700"
          loading={loading}
          onClick={() => navigate("/attendance-report")}
        />

        <KpiCard
          title="Today Movement"
          value={
            <div className="mt-2 grid grid-cols-2 gap-4 text-sm font-semibold">
              <span>Present: {data.presentToday}</span>
              <span>Absent: {data.absentToday}</span>
              <span className="text-green-700 flex items-center gap-1">
                <IoMdLogOut className="rotate-180" /> {data.inEmployees}
              </span>
              <span className="text-red-600 flex items-center gap-1">
                <IoMdLogOut /> {data.outEmployees}
              </span>
            </div>
          }
          icon={<GiOpenGate size={20} />}
          gradient="from-sky-50 to-sky-100"
          border="border-sky-200"
          text="text-sky-700"
          loading={loading}
          onClick={() => navigate("/liveattend")}
        />
      </div>

      {/* DEPARTMENTS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-6">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="bg-slate-100 border border-slate-200 rounded-2xl p-4"
            >
              <Skeleton className="h-5 w-32 mb-4" />
              <Skeleton className="h-4 w-40 mb-3" />
              <Skeleton className="h-4 w-full" />
            </div>
          ))
          : data.departments?.map((dept) => (
            <div
              key={dept._id}
              onClick={() =>
                navigate(`/employees?department=${dept._id}`)
              }
              className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 rounded-2xl p-4 shadow-sm card-hover cursor-pointer"
            >
              <div className="flex justify-between mb-4">
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
                <span className="font-bold">
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
const KpiCard = ({
  title,
  value,
  icon,
  gradient,
  text,
  border,
  onClick,
  loading,
}) => {
  return (
    <div
      onClick={loading ? undefined : onClick}
      className={`bg-gradient-to-br ${gradient} border ${border} rounded-2xl p-5 shadow-sm card-hover`}
    >
      <div className="h-full flex items-center justify-between">
        <div>
          <p className={`text-sm font-semibold ${text}`}>
            {title}
          </p>

          {loading ? (
            <Skeleton className="h-8 w-20 mt-2" />
          ) : (
            <div className="text-3xl font-bold text-gray-900 mt-1">
              {value}
            </div>
          )}
        </div>

        <div className="bg-white p-3 rounded-lg shadow">
          <span className={text}>{icon}</span>
        </div>
      </div>
    </div>
  );
};

export default Cards;
