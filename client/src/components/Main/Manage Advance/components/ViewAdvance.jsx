import React from "react";
import { 
  IoCloseSharp, 
  IoPersonOutline, 
  IoCalendarOutline,
  IoCashOutline,
  IoDocumentTextOutline,
  IoCardOutline,
  IoCloudUploadOutline,
  IoCalculatorOutline
} from "react-icons/io5";
import { 
  FiUser, 
  FiCalendar, 
  FiDollarSign, 
  FiFileText,
  FiCheckCircle,
  FiXCircle,
  FiClock
} from "react-icons/fi";
import { TbPigMoney } from "react-icons/tb";

const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/149/149071.png";

const ViewAdvance = ({ data, onClose }) => {
  if (!data) return null;

  // 计算相关数据
  const deduction = data.deduction || 0;
  const balance = data.balance || data.amount;
  const paidPercentage = ((deduction / data.amount) * 100).toFixed(1);
  const remainingInstallments = data.instalment 
    ? data.instalment - (data.paidInstallments || 0)
    : 0;

  // 格式化日期
  const formatDate = (dateString) => {
    if (!dateString) return "Not set";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // 获取状态颜色和图标
  const getStatusInfo = (status) => {
    switch (status) {
      case 'active':
        return {
          color: 'text-green-600',
          bg: 'bg-green-50',
          border: 'border-green-100',
          icon: FiCheckCircle,
          label: 'Active'
        };
      case 'inactive':
        return {
          color: 'text-red-600',
          bg: 'bg-red-50',
          border: 'border-red-100',
          icon: FiXCircle,
          label: 'Inactive'
        };
      default:
        return {
          color: 'text-gray-600',
          bg: 'bg-gray-50',
          border: 'border-gray-100',
          icon: FiClock,
          label: status || 'Pending'
        };
    }
  };

  const statusInfo = getStatusInfo(data.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto main-scroll">
        
        {/* HEADER */}
        <div className="sticky top-0 bg-white z-10 border-b p-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                <TbPigMoney className="text-white text-2xl" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Advance / Loan Details
                </h2>
                <p className="text-gray-500">
                  Complete information about this financial record
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <IoCloseSharp size={28} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* CONTENT */}
        <div className="p-6 space-y-6">
          
          {/* EMPLOYEE INFO SECTION */}
          <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
              <IoPersonOutline className="text-gray-600" />
              Employee Information
            </h3>
            <div className="flex items-center gap-4">
              <img
                src={data.employee?.avatar || DEFAULT_AVATAR}
                alt={data.employee?.name}
                className="w-16 h-16 rounded-full border-4 border-white shadow-lg"
              />
              <div>
                <h4 className="text-xl font-bold text-gray-900">{data.employee?.name}</h4>
                <div className="flex flex-wrap gap-3 mt-2">
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-white rounded-full text-sm border border-gray-300">
                    <span className="text-gray-500">ID:</span>
                    <span className="font-medium">{data.employee?.empId}</span>
                  </span>
                  {/* <span className="inline-flex items-center gap-1 px-3 py-1 bg-white rounded-full text-sm border border-gray-300">
                    <span className="text-gray-500">Department:</span>
                    <span className="font-medium">{data.employee?.designation?.name || 'N/A'}</span>
                  </span> */}
                </div>
              </div>
            </div>
          </div>

          {/* FINANCIAL OVERVIEW */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* MAIN FINANCIAL CARD */}
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-5 text-white">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-gray-300 text-sm">Total Amount</p>
                  <h3 className="text-3xl font-bold mt-1">₹{data.amount}</h3>
                </div>
                <div className="p-3 bg-white/20 rounded-lg">
                  <IoCashOutline size={28} />
                </div>
              </div>
              
              <div className="space-y-3 mt-6">
                <div className="flex justify-between">
                  <span className="text-gray-300">Paid</span>
                  <span className="font-semibold">₹{deduction}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Balance</span>
                  <span className="font-semibold text-red-300">₹{balance}</span>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-6">
                <div className="flex justify-between text-sm mb-2">
                  <span>Payment Progress</span>
                  <span>{paidPercentage}%</span>
                </div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-500"
                    style={{ width: `${paidPercentage}%` }}
                  />
                </div>
              </div>
            </div>

            {/* DETAILS CARD */}
            <div className="border border-gray-200 rounded-xl p-5">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
                <IoDocumentTextOutline className="text-gray-600" />
                Transaction Details
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Type</p>
                    <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                      data.type === 'loan' 
                        ? 'bg-blue-50 text-blue-700 border border-blue-100'
                        : 'bg-purple-50 text-purple-700 border border-purple-100'
                    }`}>
                      {data.type === 'loan' ? 'Loan' : 'Advance'}
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-500 mb-1">Status</p>
                    <div className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                      statusInfo.bg
                    } ${statusInfo.color} border ${statusInfo.border}`}>
                      <statusInfo.icon size={14} />
                      {statusInfo.label}
                    </div>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-gray-500 mb-1">Transaction Date</p>
                  <div className="flex items-center gap-2 text-gray-900 font-medium">
                    <IoCalendarOutline className="text-gray-400" />
                    {formatDate(data.date)}
                  </div>
                </div>

                {data.type === 'loan' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Installments</p>
                        <div className="flex items-center gap-2">
                          <IoCalculatorOutline className="text-gray-400" />
                          <span className="font-medium">
                            {data.instalment || 'Not set'}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Start From</p>
                        <div className="flex items-center gap-2">
                          <FiCalendar className="text-gray-400" />
                          <span className="font-medium">
                            {formatDate(data.start_from)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* LOAN SPECIFIC DETAILS */}
          {data.type === 'loan' && (
            <div className="border border-gray-200 rounded-xl p-5">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
                <IoCardOutline className="text-gray-600" />
                Loan Repayment Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* INSTALLMENT SUMMARY */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-center">
                    <p className="text-sm text-gray-500 mb-1">Monthly Installment</p>
                    <p className="text-2xl font-bold text-gray-900">
                      ₹{((data.amount || 0) / (data.instalment || 1)).toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* PROGRESS */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-center">
                    <p className="text-sm text-gray-500 mb-1">Installments Completed</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {data.paidInstallments || 0}/{data.instalment || 0}
                    </p>
                  </div>
                </div>

                {/* REMAINING */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-center">
                    <p className="text-sm text-gray-500 mb-1">Remaining Installments</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {remainingInstallments}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* REASON / NOTES */}
          {data.reason && (
            <div className="border border-gray-200 rounded-xl p-5">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
                <IoDocumentTextOutline className="text-gray-600" />
                Reason / Notes
              </h3>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-700 whitespace-pre-wrap">{data.reason}</p>
              </div>
            </div>
          )}

          {/* ATTACHMENT */}
          {data.attachment && (
            <div className="border border-gray-200 rounded-xl p-5">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
                <IoCloudUploadOutline className="text-gray-600" />
                Attached Document
              </h3>
              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="p-3 bg-white rounded-lg border">
                  {data.attachment.type?.includes('image') ? (
                    <img 
                      src={data.attachment.url} 
                      alt="Attachment" 
                      className="w-12 h-12 object-cover rounded"
                    />
                  ) : (
                    <div className="w-12 h-12 flex items-center justify-center bg-indigo-100 rounded">
                      <FiFileText className="text-indigo-600" size={24} />
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {data.attachment.name || 'Document'}
                  </p>
                  <p className="text-sm text-gray-500 mt-1">
                    {data.attachment.type || 'File'} • {data.attachment.size ? 
                      `${(data.attachment.size / 1024 / 1024).toFixed(2)} MB` : 
                      'Size not available'}
                  </p>
                </div>
                <a 
                  href={data.attachment.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                >
                  View File
                </a>
              </div>
            </div>
          )}

          {/* TIMELINE / HISTORY */}
          <div className="border border-gray-200 rounded-xl p-5">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 mb-4">
              <FiClock className="text-gray-600" />
              Record History
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-gray-700">Created</span>
                </div>
                <span className="text-gray-500 text-sm">
                  {formatDate(data.createdAt || data.date)}
                </span>
              </div>
              {data.updatedAt && (
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <span className="text-gray-700">Last Updated</span>
                  </div>
                  <span className="text-gray-500 text-sm">
                    {formatDate(data.updatedAt)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FOOTER */}
        <div className="sticky bottom-0 bg-white border-t p-6">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
            {data.attachment?.url && (
              <a
                href={data.attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-3 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-colors inline-flex items-center gap-2"
              >
                <IoCloudUploadOutline />
                Download Document
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewAdvance;