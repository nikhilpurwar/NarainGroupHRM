import React from "react"
import { FaBell, FaCheckCircle, FaClipboardList, FaTimes } from "react-icons/fa"

const Notification = ({
  showNotifications,
  notificationRef,
  insuranceAlerts,
  selectedNotification,
  setSelectedNotification,
   setShowNotifications, 
  setInsuranceAlerts,
  viewedNotifs,
  setViewedNotifs,
  navigate
}) => {
  if (!showNotifications) return null

  return (
    <div
      // ref={notificationRef}
      className="absolute right-6 top-20 w-[440px] rounded-[28px] 
        bg-white/95 backdrop-blur-xl border border-gray-200/70
        shadow-[0_35px_80px_rgba(0,0,0,0.28)]
        z-50 overflow-hidden animate-fadeIn"
    >
{/* HEADER */}
      <div className="sticky top-0 z-20 px-6 py-5
        bg-white/90 backdrop-blur-xl border-b border-gray-200/60 flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <FaClipboardList className="text-indigo-500" /> Notifications
        </h3>

        <div className="flex items-center gap-3">
          <span className="min-w-[20px] h-5 px-1 flex items-center justify-center
            text-xs font-bold rounded-full bg-gradient-to-br from-indigo-500 to-indigo-600
            text-white shadow-sm">
           {insuranceAlerts.filter(n => !viewedNotifs.includes(n.id)).length}

          </span>

          <button
            onClick={() => {
              setShowNotifications(false);
              setSelectedNotification(null);
            }}
            className="w-8 h-8 flex items-center justify-center
              rounded-full text-gray-500 hover:text-gray-900
              hover:bg-gray-200 transition"
            title="Close"
          >
            <FaTimes />
          </button>
        </div>
      </div>


      {/* LIST */}
      {!selectedNotification && (
        <div className="max-h-[400px] overflow-y-auto px-2 py-1 space-y-1">
          {insuranceAlerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center 
              py-20 px-6 text-center">
              <div className="relative mb-5">
                <div className="absolute inset-0 rounded-full 
                  bg-green-400/20 blur-xl" />
                <div className="relative w-16 h-16 flex items-center justify-center 
                  rounded-full bg-green-100 text-green-600 text-2xl font-bold">
                  ✓
                </div>
              </div>

              <p className="text-base font-semibold text-gray-800">
                You’re all clear ✨
              </p>
              <p className="text-sm text-gray-500 mt-1">
                Nothing needs your attention right now
              </p>
            </div>
          ) : (
            insuranceAlerts.map(notif => (
              <button
                key={notif.id}
                onClick={() => {
  // 1. Mark as viewed
  if (!viewedNotifs.includes(notif.id)) {
    const updatedViewed = [...viewedNotifs, notif.id]
    setViewedNotifs(updatedViewed)
    localStorage.setItem("viewedNotifs", JSON.stringify(updatedViewed))
  }

  // 2. Navigate
  navigate(`/employee/${notif.emp._id}/edit`, {
    state: { scrollTo: "vehicle" },
  })
}}
                className="relative w-full text-left 
                  rounded-2xl px-5 py-4 
                  bg-white border border-gray-200/70
                  transition-all duration-200
                  hover:shadow-lg hover:-translate-y-[1px]
                  hover:border-gray-300
                  active:translate-y-0"
              >
                {/* STATUS STRIPE */}
                <span
                  className={`absolute left-0 top-3 bottom-3 w-1 rounded-full
                    ${notif.status.label === "Expired"
                      ? "bg-red-500"
                      : "bg-orange-400"
                    }`}
                />

                <div className="flex items-start gap-4 pl-2">
                  {/* ICON */}
                  <div
                    className={`relative p-3 rounded-full shrink-0
                      shadow-sm ring-1
                      ${notif.status.label === "Expired"
                        ? "bg-red-100 text-red-600 ring-red-200"
                        : "bg-orange-100 text-orange-600 ring-orange-200"
                      }`}
                  >
                    <FaBell size={14} />
                  </div>

                  {/* CONTENT */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-gray-900 truncate">
                        {notif.title}
                      </p>

                      {viewedNotifs.includes(notif.id) && (
                        <FaCheckCircle className="text-green-500 text-sm shrink-0" />
                      )}
                    </div>

                    <p className="text-sm text-gray-600 mt-1 leading-snug line-clamp-2">
                      {notif.message}
                    </p>

                    <p className="text-xs text-gray-400 mt-2">
                      Expiry • {new Date(notif.expiry).toLocaleDateString()}
                    </p>
                  </div>

                  {/* BADGE */}
                  {notif.resolved ? (
                    <span className="shrink-0 self-start
                      bg-green-100 text-green-700
                      text-[11px] font-bold
                      px-3 py-1 rounded-full">
                      Completed
                    </span>
                  ) : (
                    <span
                      className={`shrink-0 self-start
                        text-[11px] font-bold
                        px-3 py-1 rounded-full
                        ${notif.status.label === "Expired"
                          ? "bg-red-100 text-red-700"
                          : "bg-orange-100 text-orange-700"
                        }`}
                    >
                      {notif.status.label}
                    </span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* FOOTER */}
      {insuranceAlerts.length > 0 && (
        <div className="flex items-center justify-between 
          px-6 py-4 bg-white/80 backdrop-blur-xl
          border-t border-gray-200/60">
          <button
            onClick={() => setViewedNotifs(insuranceAlerts.map(n => n.id))}
            className="text-xs font-semibold text-indigo-600
              hover:text-indigo-700 transition"
          >
            Mark all as read
          </button>

          <button
            onClick={() => {
              setInsuranceAlerts([])
              setViewedNotifs([])
              localStorage.removeItem("viewedNotifs")
            }}
            className="text-xs font-semibold text-red-600
              hover:text-red-700 transition"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  )
}

export default Notification
