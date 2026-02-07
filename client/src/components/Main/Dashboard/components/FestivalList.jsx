import { Eye } from "lucide-react"
import React from "react"
import { useNavigate } from "react-router-dom"

const FestivalList = ({ holidays, loading }) => {
  const navigate = useNavigate()

  return (
    <div className="border rounded-2xl bg-white shadow-lg overflow-hidden">

      {/* HEADER */}
      <div className="flex justify-between items-center p-4 text-white bg-gray-900 font-semibold text-xl">
        <span>Holidays in Next 30 Days</span>

        {/* VIEW MORE */}
        <button
          onClick={() => navigate("/festival")}
          className="flex items-center gap-2 bg-white text-black rounded px-2 py-1 text-sm hover:bg-white-200"
        >
          <Eye size={16} />
          View more
        </button>
      </div>

      {/* TABLE */}
      <table className="table-auto w-full border-collapse">
        <thead className="bg-gray-100 text-gray-700 border-b">
          <tr>
            <th className="px-4 py-3 text-left">S. No.</th>
            <th className="px-4 py-3 text-left">Festival Name</th>
            <th className="px-4 py-3 text-left">Festival Date</th>
            <th className="px-4 py-3 text-left">Created On</th>
          </tr>
        </thead>

        {loading ? (
          <tbody>
            {[...Array(5)].map((_, index) => (
              <tr key={index}>
                {[...Array(4)].map((_, i) => (
                  <td key={i} className="px-4 py-3">
                    <div className="animate-pulse bg-gray-200 h-4 rounded"></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        ) : (
          <tbody>
            {holidays.length > 0 ? (
              holidays.map((item, index) => (
                <tr
                  key={item._id}
                  className="border-t hover:bg-gray-100 transition"
                >
                  <td className="px-4 py-3">{index + 1}</td>
                  <td className="px-4 py-3">{item.name}</td>
                  <td className="px-4 py-3">
                    {item.date
                      ? new Date(item.date).toLocaleDateString()
                      : "-"}
                  </td>
                  <td className="px-4 py-3">
                    {item.createdAt
                      ? new Date(item.createdAt).toLocaleDateString()
                      : "-"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" className="text-center p-4 text-gray-500">
                  No holidays in the next 30 days.
                </td>
              </tr>
            )}
          </tbody>
        )}
      </table>
    </div>
  )
}

export default FestivalList
