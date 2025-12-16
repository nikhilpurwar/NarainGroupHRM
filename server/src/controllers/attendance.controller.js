import Employee from "../models/employee.model.js";

const monthDays = (year, month) => {
  // month: 1-12
  const m = parseInt(month, 10);
  const y = parseInt(year, 10);
  const daysInMonth = new Date(y, m, 0).getDate();
  const arr = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const dateObj = new Date(y, m - 1, d);
    const iso = dateObj.toISOString().slice(0, 10); // YYYY-MM-DD
    const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
    arr.push({ date: String(d).padStart(2, '0'), iso, day: dayName });
  }
  return arr;
};

export const attendanceReport = async (req, res) => {
  try {
    const { employeeId, month, year, search } = req.query;
    // default month/year to current if not provided
    const now = new Date();
    const queryMonth = month || String(now.getMonth() + 1);
    const queryYear = year || String(now.getFullYear());

    if (employeeId) {
      const emp = await Employee.findById(employeeId);
      if (!emp) return res.status(404).json({ success: false, message: 'Employee not found' });

      const days = monthDays(queryYear, queryMonth);

      // build data rows: Status, InTime, OutTime, Note
      const statusRow = [];
      const inRow = [];
      const outRow = [];
      const noteRow = [];

      days.forEach(d => {
        const rec = (emp.attendance || []).find(a => {
          const aDate = a.date ? (typeof a.date === 'string' ? a.date : a.date.toISOString().slice(0, 10)) : null
          return aDate === d.iso
        });
        if (rec) {
          statusRow.push(rec.status || 'present');
          inRow.push(rec.inTime || '');
          outRow.push(rec.outTime || '');
          noteRow.push(rec.note || '');
        } else {
          statusRow.push(null);
          inRow.push(null);
          outRow.push(null);
          noteRow.push(null);
        }
      });

      const table = {
        Status: statusRow,
        In: inRow,
        Out: outRow,
        Note: noteRow,
      };

      return res.json({ success: true, data: { employee: emp, days, table } });
    }

    // if no employeeId: support search to return first matched employee report
    const q = {};
    if (search) q.name = { $regex: search, $options: 'i' };
    const emp = await Employee.findOne(q).lean();
    if (!emp) return res.json({ success: true, data: null });

    const days = monthDays(queryYear, queryMonth);
    const statusRow = [];
    const inRow = [];
    const outRow = [];
    const noteRow = [];
    days.forEach(d => {
      const rec = (emp.attendance || []).find(a => a.date === d.iso || a.date === d.date || a.date?.startsWith(d.iso));
      if (rec) {
        statusRow.push(rec.status || 'present');
        inRow.push(rec.inTime || '');
        outRow.push(rec.outTime || '');
        noteRow.push(rec.note || '');
      } else {
        statusRow.push(null);
        inRow.push(null);
        outRow.push(null);
        noteRow.push(null);
      }
    });
    const table = { Status: statusRow, In: inRow, Out: outRow, Note: noteRow };
    return res.json({ success: true, data: { employee: emp, days, table } });
  } catch (err) {
    console.error('Attendance report error', err);
    res.status(500).json({ success: false, message: err.message });
  }
};
