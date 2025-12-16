import React, { useEffect, useState } from "react";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5100'
const API = `${API_URL}/api/holidays`;

const FestivalList = () => {
  const [upcomingHolidays, setUpcomingHolidays] = useState([]);

  const fetchUpcoming = async () => {
    try {
      const res = await axios.get(API_URL);
      const holidays = res.data.data;

      const today = new Date();
      const next30 = new Date();
      next30.setDate(today.getDate() + 30);

      // Filter next 30-day holidays
      const filtered = holidays.filter((item) => {
        const date = new Date(item.date);
        return date >= today && date <= next30;
      });

      setUpcomingHolidays(filtered);
    } catch (err) {
      console.error("Error fetching holidays", err);
    }
  };

  useEffect(() => {
    fetchUpcoming();
  }, []);

  return (
    <div className="border border-gray-300 rounded-xl shadow-lg overflow-hidden">
      {/* Header */}
      <div className="flex justify-between items-center p-4 text-white bg-gray-900 font-semibold text-lg rounded-t-xl">
        Holidays in Next 30 Days
      </div>

      {/* Table */}
      <table className="table-auto w-full border-collapse">
        <thead className="bg-gray-100 text-gray-700">
          <tr>
            <th className="px-4 py-2 text-left">S. No.</th>
            <th className="px-4 py-2 text-left">Festival Name</th>
            <th className="px-4 py-2 text-left">Festival Date</th>
            <th className="px-4 py-2 text-left">Created On</th>
          </tr>
        </thead>

        <tbody>
          {upcomingHolidays.length > 0 ? (
            upcomingHolidays.map((item, index) => (
              <tr key={item._id} className="hover:bg-gray-50">
                <td className="px-4 py-3 border-t">{index + 1}</td>
                <td className="px-4 py-3 border-t">{item.name}</td>
                <td className="px-4 py-3 border-t">
                  {item.date?.split("T")[0]}
                </td>
                <td className="px-4 py-3 border-t">
                  {item.createdAt?.split("T")[0]}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan="4"
                className="text-center px-4 py-4 border-t text-gray-500"
              >
                No holidays in the next 30 days.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default FestivalList;
