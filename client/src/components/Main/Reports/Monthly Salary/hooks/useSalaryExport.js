import { useCallback } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { toast } from 'react-toastify';

export const useSalaryExport = (getSelectedMonthYearLabel) => {
  // Export to PDF
  const exportToPDF = useCallback((salaryData, filters, totalRecords) => {
    try {
      const doc = new jsPDF('l', 'mm', 'a4');
      const monthYear = getSelectedMonthYearLabel();

      // Title
      doc.setFontSize(18);
      doc.text(`Monthly Salary Report - ${monthYear}`, 14, 15);

      // Date and filters
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22);
      if (filters.employeeName) {
        doc.text(`Filter: ${filters.employeeName}`, 14, 29);
      }

      // Table headers
      const headers = [
        ['Emp ID', 'Emp Name', 'Group', 'Basic Pay', 'OT Pay', 'Total Pay', 'Deductions', 'Net Pay', 'Status']
      ];

      // Table data
      const data = salaryData.map(item => [
        item.empId,
        item.empName,
        item.group,
        `₹${item.basicPay?.toLocaleString() || '0'}`,
        `₹${item.otPay?.toLocaleString() || '0'}`,
        `₹${item.totalPay?.toLocaleString() || '0'}`,
        `₹${item.totalDeductions?.toLocaleString() || '0'}`,
        `₹${item.netPay?.toLocaleString() || '0'}`,
        item.status
      ]);

      // Generate table
      doc.autoTable({
        head: headers,
        body: data,
        startY: 40,
        margin: { top: 40 },
        styles: { fontSize: 8 },
        headStyles: { fillColor: [51, 51, 51], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 245, 245] }
      });

      // Footer
      const finalY = doc.lastAutoTable.finalY || 40;
      doc.setFontSize(10);
      doc.text(`Total Records: ${totalRecords}`, 14, finalY + 10);

      const cleanFileName = `Salary_Report_${monthYear.replace(/[|\\/:*?"<>]/g, '-').replace(/\s+/g, '_')}`;
      doc.save(`${cleanFileName}.pdf`);
      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF. Please try again.');
    }
  }, [getSelectedMonthYearLabel]);

  // Export to Excel
  const exportToExcel = useCallback((salaryData, filters) => {
    try {
      const monthYear = getSelectedMonthYearLabel();

      // Prepare data
      const ws_data = [
        [`Monthly Salary Report - ${monthYear}`],
        [`Generated on: ${new Date().toLocaleDateString()}`],
        filters.employeeName ? [`Filter: ${filters.employeeName}`] : [],
        [],
        [
          'Emp ID', 'Emp Name', 'Group', 'Basic Salary', 'Salary/Day',
          'Present Days', 'Basic Hours', 'Basic Pay', 'OT Hours', 'OT Pay',
          'Total Hours', 'Total Pay', 'TDS', 'P.Tax', 'LWF', 'ESI',
          'Basic PF', 'OT PF', 'Insurance', 'Advance', 'Loan Pending',
          'Loan Received', 'Loan Deduct', 'Total Deductions', 'Net Pay', 'Status'
        ],
        ...salaryData.map(item => [
          item.empId,
          item.empName,
          item.group,
          item.salary,
          item.salaryPerDay,
          item.presentDays,
          item.basicHours,
          item.basicPay,
          item.otHours,
          item.otPay,
          item.totalHours,
          item.totalPay,
          item.tds,
          item.pTax,
          item.lwf,
          item.esi,
          item.basicPF,
          item.otPF,
          item.insurance,
          item.advance,
          item.loanPending,
          item.loanReceived,
          item.loanDeduct,
          item.totalDeductions,
          item.netPay,
          item.status
        ])
      ];

      const ws = XLSX.utils.aoa_to_sheet(ws_data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Salary Report');

      if (!ws['!merges']) ws['!merges'] = [];
      ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 25 } });

      XLSX.writeFile(wb, `Salary_Report_${monthYear.replace(/\s+/g, '_')}.xlsx`);
      toast.success('Excel exported successfully');
    } catch (error) {
      console.error('Error exporting Excel:', error);
      toast.error('Failed to export Excel. Please try again.');
    }
  }, [getSelectedMonthYearLabel]);

  // Print report
  const printReport = useCallback((salaryData, filters, totalRecords) => {
    try {
      const printWindow = window.open('', '_blank');
      const monthYear = getSelectedMonthYearLabel();

      const content = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Monthly Salary Report - ${monthYear}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; border-bottom: 2px solid #333; padding-bottom: 10px; }
            .info { margin-bottom: 20px; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th { background-color: #333; color: white; padding: 10px; text-align: left; }
            td { padding: 8px; border: 1px solid #ddd; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .total-row { font-weight: bold; background-color: #e8f4f8 !important; }
            .header-row { background-color: #f0f0f0 !important; font-weight: bold; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            @media print {
              body { margin: 0; }
              table { font-size: 12px; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>Monthly Salary Report - ${monthYear}</h1>
          <div class="info">
            <p>Generated on: ${new Date().toLocaleDateString()}</p>
            ${filters.employeeName ? `<p>Filter: ${filters.employeeName}</p>` : ''}
            <p>Total Records: ${totalRecords}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Emp ID</th>
                <th>Emp Name</th>
                <th>Group</th>
                <th>Basic Pay</th>
                <th>OT Pay</th>
                <th>Total Pay</th>
                <th>Deductions</th>
                <th>Net Pay</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${salaryData.map(item => `
                <tr>
                  <td>${item.empId}</td>
                  <td>${item.empName}</td>
                  <td>${item.group}</td>
                  <td>₹${item.basicPay?.toLocaleString() || '0'}</td>
                  <td>₹${item.otPay?.toLocaleString() || '0'}</td>
                  <td>₹${item.totalPay?.toLocaleString() || '0'}</td>
                  <td>₹${item.totalDeductions?.toLocaleString() || '0'}</td>
                  <td>₹${item.netPay?.toLocaleString() || '0'}</td>
                  <td>${item.status}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="no-print" style="margin-top: 20px;">
            <button onclick="window.print()">Print</button>
            <button onclick="window.close()">Close</button>
          </div>
        </body>
        </html>
      `;

      printWindow.document.write(content);
      printWindow.document.close();
      printWindow.focus();
    } catch (error) {
      console.error('Error printing report:', error);
      toast.error('Failed to print report');
    }
  }, [getSelectedMonthYearLabel]);

  return {
    exportToPDF,
    exportToExcel,
    printReport
  };
};
