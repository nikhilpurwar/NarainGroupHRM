import React, { memo } from 'react';
import { Printer, Download } from 'lucide-react';

const SalaryExportButtons = memo(({ onPrint, onExportExcel }) => {
  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={onPrint}
        className="flex-1 flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-900 text-white font-medium py-2.5 px-4 rounded-lg transition duration-200"
        title="Print Report"
      >
        <Printer size={18} />
      </button>

      <button
        type="button"
        onClick={onExportExcel}
        className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 px-4 rounded-lg transition duration-200"
        title="Download Excel"
      >
        <Download size={18} />
      </button>
    </div>
  );
});

SalaryExportButtons.displayName = 'SalaryExportButtons';

export default SalaryExportButtons;
