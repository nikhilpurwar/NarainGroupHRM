import { useCallback } from 'react';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { toast } from 'react-toastify';

export const useSalaryPDF = (getSelectedMonthYearLabel) => {
  const downloadEmployeePDF = useCallback((employee) => {
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      const monthYear = getSelectedMonthYearLabel();

      // Header with company info
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, 210, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(20);
      doc.text('Salary Slip', 105, 15, { align: 'center' });
      doc.setFontSize(12);
      doc.text(`${monthYear}`, 105, 25, { align: 'center' });
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 105, 32, { align: 'center' });

      // Reset text color
      doc.setTextColor(0, 0, 0);

      // Employee Information
      let yPos = 50;
      doc.setFontSize(14);
      doc.setFont(undefined, 'bold');
      doc.text('Employee Information', 14, yPos);
      yPos += 7;

      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Employee ID: ${employee.empId}`, 14, yPos);
      doc.text(`Status: ${employee.status || 'Calculated'}`, 150, yPos);
      yPos += 6;
      doc.text(`Employee Name: ${employee.empName}`, 14, yPos);
      yPos += 6;
      doc.text(`Department: ${employee.department || 'N/A'}`, 14, yPos);
      doc.text(`Sub Dept: ${employee.group || 'N/A'}`, 150, yPos);
      yPos += 10;

      // Salary Details Table
      doc.autoTable({
        startY: yPos,
        head: [['Description', 'Value']],
        body: [
          ['Monthly Salary', `₹${employee.salary?.toLocaleString() || '0'}`],
          ['Salary Per Day', `₹${employee.salaryPerDay?.toLocaleString() || '0'}`],
          ['Salary Per Hour', `₹${employee.salaryPerHour?.toLocaleString() || '0'}`],
          ['Present Days', employee.presentDays || '0'],
        ],
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235] },
        margin: { left: 14, right: 14 },
        styles: { fontSize: 10 },
      });

      yPos = doc.lastAutoTable.finalY + 10;

      // Hours & Pay Table
      doc.autoTable({
        startY: yPos,
        head: [['Description', 'Hours/Amount']],
        body: [
          ['Basic Hours', `${employee.basicHours || '0'} hrs`],
          ['Basic Pay', `₹${employee.basicPay?.toLocaleString() || '0'}`],
          ['OT Hours', `${employee.otHours || '0'} hrs`],
          ['OT Pay', `₹${employee.otPay?.toLocaleString() || '0'}`],
          ['Total Hours', `${employee.totalHours || '0'} hrs`],
        ],
        theme: 'striped',
        headStyles: { fillColor: [37, 99, 235] },
        margin: { left: 14, right: 14 },
        styles: { fontSize: 10 },
      });

      yPos = doc.lastAutoTable.finalY + 5;

      // Total Pay (Highlighted)
      doc.setFillColor(220, 252, 231);
      doc.rect(14, yPos, 182, 10, 'F');
      doc.setFont(undefined, 'bold');
      doc.text('Total Pay (Gross):', 20, yPos + 7);
      doc.text(`₹${employee.totalPay?.toLocaleString() || '0'}`, 190, yPos + 7, { align: 'right' });
      doc.setFont(undefined, 'normal');
      yPos += 15;

      // Deductions Table
      doc.autoTable({
        startY: yPos,
        head: [['Deduction Type', 'Amount']],
        body: [
          ['TDS', `₹${employee.tds?.toLocaleString() || '0'}`],
          ['Professional Tax', `₹${employee.pTax?.toLocaleString() || '0'}`],
          ['LWF', `₹${employee.lwf?.toLocaleString() || '0'}`],
          ['ESI', `₹${employee.esi?.toLocaleString() || '0'}`],
          ['Basic PF', `₹${employee.basicPF?.toLocaleString() || '0'}`],
          ['OT PF', `₹${employee.otPF?.toLocaleString() || '0'}`],
          ['Insurance', `₹${employee.insurance?.toLocaleString() || '0'}`],
          ['Advance', `₹${employee.advance?.toLocaleString() || '0'}`],
          ['Loan Deduct', `₹${employee.loanDeduct?.toLocaleString() || '0'}`],
        ],
        theme: 'striped',
        headStyles: { fillColor: [220, 38, 38] },
        margin: { left: 14, right: 14 },
        styles: { fontSize: 10 },
      });

      yPos = doc.lastAutoTable.finalY + 5;

      // Total Deductions (Highlighted)
      doc.setFillColor(254, 252, 232);
      doc.rect(14, yPos, 182, 10, 'F');
      doc.setFont(undefined, 'bold');
      doc.text('Total Deductions:', 20, yPos + 7);
      doc.text(`₹${employee.totalDeductions?.toLocaleString() || '0'}`, 190, yPos + 7, { align: 'right' });
      yPos += 15;

      // Net Pay (Highlighted)
      doc.setFillColor(219, 234, 254);
      doc.rect(14, yPos, 182, 12, 'F');
      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text('Net Pay (Take Home):', 20, yPos + 8);
      doc.text(`₹${employee.netPay?.toLocaleString() || '0'}`, 190, yPos + 8, { align: 'right' });

      // Footer
      doc.setFontSize(8);
      doc.setFont(undefined, 'italic');
      doc.text('This is a system-generated document. No signature required.', 105, 285, { align: 'center' });

      // Save PDF
      const cleanFileName = `Salary_Slip_${employee.empId}_${monthYear.replace(/[|\\/:*?"<>]/g, '-').replace(/\s+/g, '_')}`;
      doc.save(`${cleanFileName}.pdf`);
      toast.success(`Salary slip downloaded for ${employee.empName}`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to download salary slip. Please try again.');
    }
  }, [getSelectedMonthYearLabel]);

  return { downloadEmployeePDF };
};
