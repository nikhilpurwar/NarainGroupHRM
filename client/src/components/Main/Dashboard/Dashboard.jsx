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
  // const [employeeFilter, setEmployeeFilter] = useState("all");

  useEffect(() => {
    axios
      .get(`${import.meta.env.VITE_API_URL}/api/dashboard/summary`)
      .then((res) => {
        setData(res.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Dashboard API error:", err);
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

  // // Attendance Trend
  // const attendanceTrend = {
  //   labels: data?.attendanceTrend?.labels || [],
  //   datasets: [
  //     {
  //       label: "Present",
  //       data: data?.attendanceTrend?.datasets?.map((d) => d.present) || [],
  //       backgroundColor: "#16a34a",
  //     },
  //     {
  //       label: "Absent",
  //       data: data?.attendanceTrend?.datasets?.map((d) => d.absent) || [],
  //       backgroundColor: "#dc2626",
  //     },
  //   ],
  // };
  // // Today's attendance donut
  // const attendanceDonut = {
  //   labels: ["Present", "Absent", "On Leave"],
  //   datasets: [
  //     {
  //       data: [
  //         data?.attendance?.present || 0,
  //         data?.attendance?.absent || 0,
  //         data?.attendance?.onLeave || 0,
  //       ],
  //       backgroundColor: ["#16a34a", "#dc2626", "#f59e0b"],
  //     },
  //   ],
  // };
  return (
   <div className="p-6 bg-gray-100 min-h-screen space-y-8">
  <Cards data={cardData} />

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow col-span-2">
            <h2 className="text-xl font-bold mb-4">
              Attendance Trend (Last 7 Days)
            </h2>
               {/* <div className="h-20 w-20 flex align-right" >
              <Doughnut data={attendanceDonut}/>
              </div> */}
            <LineTrendChart
              data={(data?.attendanceTrend?.datasets || []).map((d, i) => ({
                date: data.attendanceTrend.labels[i] || `Day ${i + 1}`,
                value: d.present || 0,
              }))}
              height={160}
              stroke="#16a34a"
            />
          </div>   

           <PieCharts className="justify-center items-center" data={data} />
         
        </div> 
        {/* 
            <h2 className="text-xl font-bold mb-4">Today's Attendance</h2>
           
          </div> */}
           </div> 
      {/* Recent Employees & Holidays */}
      
      <div className="grid grid-row-1 lg:grid-cols-3 gap-6">
        {/* Recent Employees */}
        <span className="col-span-2">
          <EmployeeAttendance employees={data.recentEmployees} />
        </span>
        {/* Upcoming Holidays */}
        <FestivalList holidays={data?.upcomingHolidays || []} />
      </div>
    </div>
     
  );
};
export default Dashboard;