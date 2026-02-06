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
  Legend
);

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  if (error)
    return <div className="p-6 text-red-500">{error}</div>;

  const cardData = {
    totalEmployees: data.totalEmployees,
    activeEmployees: data.activeEmployees,
    inactiveEmployees: data.inactiveEmployees,
    presentToday: data.presentToday,
    absentToday: data.absentToday,
    inEmployees: data.inEmployees,
    outEmployees: data.outEmployees,
    monthlyPresent: data.monthly?.present || 0,
    monthlyAbsent: data.monthly?.absent || 0,
    departments: data.departments,
  };

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 min-h-screen space-y-10">
      <Cards data={cardData} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 xl:col-span-2 flex flex-col hover:shadow-md transition-shadow">
          <h2 className="text-lg md:text-xl font-semibold text-gray-800 mb-6">
            Attendance Trend
            <span className="block text-sm font-normal text-gray-500">
              Last 7 Days
            </span>
          </h2>

          <div className="flex-1 flex items-center">
            <LineTrendChart
              data={(data?.attendanceTrend?.datasets || []).map((d, i) => ({
                date: data.attendanceTrend.labels[i] || `Day ${i + 1}`,
                value: d.present || 0,
              }))}
              height={160}
              stroke="#16a34a"
            />
          </div>
        </div>

        <PieCharts data={data} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <EmployeeAttendance employees={data.recentEmployees} />
        </div>
        <FestivalList holidays={data?.upcomingHolidays || []} />
      </div>
    </div>
  );
};

export default Dashboard;
