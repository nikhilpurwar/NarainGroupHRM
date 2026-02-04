import React from "react"
import { FaBell } from "react-icons/fa"

const Notification = ({
  showNotifications,
  notificationRef,
  insuranceAlerts,
  selectedNotification,
  setSelectedNotification,
  setInsuranceAlerts,
  navigate
}) => {
  if (!showNotifications) return null

  return (
    <div  
      ref={notificationRef}
      className="absolute right-6 top-20 w-[420px] bg-white shadow-2xl border rounded-xl z-50 overflow-hidden"
    >

      {/* HEADER */}
      <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-3 border-b bg-white">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          Notifications
          <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">
            {insuranceAlerts.length}
          </span>
        </h3>

        <div className="flex gap-2">
          {insuranceAlerts.length > 0 && (
            <>
              <button
                onClick={() => setSelectedNotification(null)}
                className="text-xs text-blue-600 hover:underline"
              >
                Mark all as read
              </button>

              <button
                onClick={() => setInsuranceAlerts([])}
                className="text-xs text-red-600 hover:underline"
              >
                Clear All
              </button>
            </>
          )}
        </div>
      </div>

      {/* LIST VIEW */}
      {!selectedNotification && (
        <div className="max-h-[320px] overflow-y-auto">
          {insuranceAlerts.length === 0 ? (
            <div className="p-8 text-center">
              <div className="mx-auto mb-3 w-12 h-12 flex items-center justify-center rounded-full bg-green-100 text-green-600">
                ✓
              </div>
              <p className="text-gray-700 font-semibold">
                All caught up!
              </p>
              <p className="text-sm text-gray-500 mt-1">
                No pending notifications
              </p>
            </div>
          ) : (
            insuranceAlerts.map(notif => (
              <button
                key={notif.id}
                onClick={() => setSelectedNotification(notif)}
                className="group w-full text-left px-4 py-3 border-b hover:bg-gray-50 transition relative"
              >
                <span
                  className={`absolute left-0 top-0 h-full w-1
                    ${notif.status.label === 'Expired'
                      ? 'bg-red-500'
                      : 'bg-orange-400'
                    }`}
                />

                <div className="flex items-start gap-3 pl-2">
                  <div
                    className={`mt-1 p-2 rounded-full
                      ${notif.status.label === 'Expired'
                        ? 'bg-red-100 text-red-600'
                        : 'bg-orange-100 text-orange-600'
                      }`}
                  >
                    <FaBell size={14} />
                  </div>

                  <div className="flex-1">
                    <p className="font-semibold text-gray-800">
                      {notif.title}
                    </p>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {notif.message}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Expiry: {new Date(notif.expiry).toLocaleDateString()}
                    </p>
                  </div>

                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full
                      ${notif.status.label === 'Expired'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-orange-100 text-orange-700'
                      }`}
                  >
                    {notif.status.label}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* DETAILS VIEW */}
      {selectedNotification && (
        <div className="p-4 text-sm text-gray-800">
          <button
            onClick={() => setSelectedNotification(null)}
            className="text-xs text-blue-600 mb-3 hover:underline"
          >
            ← Back to notifications
          </button>

          <h4 className="font-semibold text-lg mb-2">
            Vehicle Insurance Details
          </h4>

          <div className="space-y-2">
            <p><strong>Employee ID:</strong> {selectedNotification.emp.empId}</p>

            <p>
              <strong>Vehicle:</strong>{" "}
              {selectedNotification.emp.vehicleInfo?.vehicleName} (
              {selectedNotification.emp.vehicleInfo?.vehicleNumber})
            </p>

            <p>
              <strong>Expiry Date:</strong>{" "}
              {new Date(selectedNotification.expiry).toLocaleDateString()}
            </p>

            <p>
              <strong>Status:</strong>{" "}
              <span className="font-semibold">
                {selectedNotification.status.label}
              </span>
            </p>
          </div>

          <div className="mt-4">
            <button
             onClick={() => {
  navigate(`/employee/${selectedNotification.emp._id}/edit`, {
    state: { scrollTo: "vehicle-info" }
  })
}}
              className="px-4 py-2 bg-gray-900 text-white rounded-md text-sm hover:bg-gray-700"
            >
              View Employee Profile
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Notification