import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

import LineTrendChart from "./components/LineTrendChart";
import Cards from "./components/Cards";
import FestivalList from "./components/FestivalList";
import { PieCharts } from "./components/PieCharts";
import EmployeeAttendance from "./components/EmployeeAttendance";
import Spinner from "../../utility/Spinner";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
);

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [trendType, setTrendType] = useState("sevenDay");
  const [trendOpen, setTrendOpen] = useState(false);
useEffect(() => {
  const close = (e) => {
    if (!e.target.closest(".trend-dropdown")) {
      setTrendOpen(false);
    }
  };
  document.addEventListener("mousedown", close);
  return () => document.removeEventListener("mousedown", close);
}, []);


  useEffect(() => {
    axios
      .get(`${import.meta.env.VITE_API_URL}/api/dashboard/summary`)
      .then((res) => {
        setData(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to fetch dashboard data.");
        setLoading(false);
      });
  }, []);

  if (loading)
    return (
      <div className="p-6 text-center">
        <Spinner />
      </div>
    );

  if (error) return <div className="p-6 text-red-500">{error}</div>;

 const cardData = {
    totalEmployees: data?.totalEmployees ?? 0,
    activeEmployees: data?.activeEmployees ?? 0,
    inactiveEmployees: data?.inactiveEmployees ?? 0,
    presentToday: data?.presentToday ?? 0,
    absentToday: data?.absentToday ?? 0,
    inEmployees: data?.inEmployees ?? 0,
    outEmployees: data?.outEmployees ?? 0,
    monthlyPresent: data?.monthly?.present ?? 0,
    monthlyAbsent: data?.monthly?.absent ?? 0,
    departments: data?.departments ?? [],
  };
 

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen space-y-6">
      <Cards  loading={loading} data={cardData} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 xl:col-span-2 flex flex-col hover:shadow-md transition-shadow">
       <div className="flex justify-between items-center mb-5 relative trend-dropdown">

  <div>
    <h2 className="text-lg md:text-xl font-semibold text-gray-800">
      Attendance Trend
    </h2>
   <p className="text-sm text-gray-500"> {trendType === "sevenDay" && "Last 7 Days"} {trendType === "monthly" && "Monthly"} {trendType === "yearly" && "Yearly"} </p>
  </div>

  {/* Trigger */}
  <button
    onClick={() => setTrendOpen(v => !v)}
    className="
      flex items-center gap-2 px-3 py-1.5
      text-sm font-medium rounded-lg
      bg-gray-100 text-gray-700
      hover:bg-gray-200 transition
      shadow-sm hover:shadow-md focus:outline-none focus:ring-2 focus:ring-green-400
    "
  >
    {trendType === "sevenDay" && "Last 7 Days"}
    {trendType === "monthly" && "Monthly"}
    {trendType === "yearly" && "Yearly"}
    <span className={`transition-transform ${trendOpen ? "rotate-180" : ""}`}>
      ▾
    </span>
  </button>

  {/* Dropdown */}
  {trendOpen && (
    <div className="absolute right-0 top-full mt-2 w-44 bg-white rounded-xl shadow-2xl ring-1 ring-black/5 z-50 overflow-hidden">

      {[
        { key: "sevenDay", label: "Last 7 Days" },
        { key: "monthly", label: "Monthly Summary" },
        { key: "yearly", label: "Yearly Overview" },
      ].map(opt => (
        <button
          key={opt.key}
          onClick={() => {
            setTrendType(opt.key);
            setTrendOpen(false);
          }}
          className={`
            w-full px-4 py-2.5 text-left text-sm transition
            hover:bg-gray-100
            ${trendType === opt.key 
              ? "bg-indigo-50 text-indigo-700 font-semibold" 
              : "text-gray-700"}
          `}
        >
          {opt.label}
        </button>
      ))}

    </div>
  )}
</div>



          <div className="flex-1 flex items-center">
            <LineTrendChart
            loading={loading}
              data={data?.attendanceTrend?.[trendType] || []}
              height={160}
              stroke="#16a34a"
            />
          </div>
        </div>

        <PieCharts loading={loading} data={data} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <EmployeeAttendance loading={loading} employees={data?.recentEmployees} />
        </div>
        <FestivalList loading={loading} holidays={data?.upcomingHolidays || []} />
      </div>
    </div>
  );
};

export default Dashboard;
