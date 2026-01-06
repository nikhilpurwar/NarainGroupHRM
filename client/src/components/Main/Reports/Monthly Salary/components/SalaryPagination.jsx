import React, { memo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const SalaryPagination = memo(({ 
  currentPage, 
  totalPages, 
  totalRecords, 
  pageSize, 
  onPageSizeChange, 
  onPrevPage, 
  onNextPage, 
  onGoToPage 
}) => {
  const from = totalRecords === 0 ? 0 : ((currentPage - 1) * pageSize) + 1;
  const to = totalRecords === 0 ? 0 : Math.min(currentPage * pageSize, totalRecords);
  return (
    <div className="border-t px-4 py-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-600">
            Showing {from} to {to} of {totalRecords}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            disabled={currentPage === 1}
            onClick={onPrevPage}
            className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={20} />
          </button>

          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => onGoToPage(pageNum)}
                  className={`w-8 h-8 flex items-center justify-center rounded-lg text-sm font-medium ${currentPage === pageNum
                    ? 'bg-blue-600 text-white'
                    : 'border border-gray-300 hover:bg-gray-50 text-gray-700'
                    }`}
                >
                  {pageNum}
                </button>
              );
            })}

            {totalPages > 5 && currentPage < totalPages - 2 && (
              <>
                <span className="px-2">...</span>
                <button
                  onClick={() => onGoToPage(totalPages)}
                  className="w-8 h-8 flex items-center justify-center border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50"
                >
                  {totalPages}
                </button>
              </>
            )}
          </div>

          <button
            disabled={currentPage === totalPages || totalPages === 0}
            onClick={onNextPage}
            className="p-2 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>
    </div>
  );
});

SalaryPagination.displayName = 'SalaryPagination';

export default SalaryPagination;
