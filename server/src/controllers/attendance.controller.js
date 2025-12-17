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
      const emp = await Employee.findById(employeeId)
        .populate('headDepartment')
        .populate('subDepartment')
        .populate('group')
        .populate('designation')
        .populate('reportsTo', 'name empId');
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
    const emp = await Employee.findOne(q)
      .populate('headDepartment')
      .populate('subDepartment')
      .populate('group')
      .populate('designation')
      .populate('reportsTo', 'name empId');
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
// Mark attendance via barcode scanner (matches Laravel 72-hour rule)
export const scanAttendance = async (req, res) => {
  try {
    const { code } = req.query;
    const { date } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: 'Barcode code is required' });
    }

    // Find employee by empId (barcode code typically contains empId)
    const emp = await Employee.findOne({ empId: code })
      .populate('headDepartment')
      .populate('subDepartment')
      .populate('group')
      .populate('designation')
      .populate('reportsTo', 'name empId');

    if (!emp) {
      return res.status(404).json({ success: false, message: 'Employee not found with this code' });
    }

    const now = new Date();
    const currentTimeString = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // ======== 72-HOUR RULE ========
    // Find the most recent incomplete attendance (punch IN without punch OUT)
    let incompleteAttendance = null;
    let latestIncompleteIndex = -1;

    if (emp.attendance && emp.attendance.length > 0) {
      for (let i = emp.attendance.length - 1; i >= 0; i--) {
        const att = emp.attendance[i];
        if (att.inTime && !att.outTime) {
          incompleteAttendance = att;
          latestIncompleteIndex = i;
          break;
        }
      }
    }

    // If incomplete attendance exists, check 72-hour rule
    if (incompleteAttendance) {
      const punchInTime = new Date(incompleteAttendance.punchLogs?.[0]?.punchTime || incompleteAttendance.date);
      const timeDiffHours = (now - punchInTime) / (1000 * 60 * 60);

      // If within 72 hours, mark PUNCH OUT
      if (timeDiffHours < 72) {
        return handlePunchOut(emp, latestIncompleteIndex, now, currentTimeString, res);
      }
      // If > 72 hours, force close that record and create new IN
    }

    // ======== PUNCH IN ========
    return handlePunchIn(emp, now, currentTimeString, res);

  } catch (err) {
    console.error('Barcode attendance error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Handle Punch IN
async function handlePunchIn(emp, now, currentTimeString, res) {
  try {
    const todayDateObj = new Date(now.toDateString());
    const dayOfWeek = now.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Create new attendance record
    const newAttendance = {
      date: todayDateObj,
      status: 'present',
      inTime: currentTimeString,
      outTime: null,
      totalHours: 0,
      regularHours: 0,
      overtimeHours: 0,
      breakMinutes: 0,
      isWeekend,
      isHoliday: false,
      punchLogs: [
        {
          punchType: 'IN',
          punchTime: now
        }
      ],
      note: 'Punch IN via barcode scanner'
    };

    emp.attendance.push(newAttendance);
    await emp.save();

    // Re-populate
    await emp.populate('headDepartment');
    await emp.populate('subDepartment');
    await emp.populate('group');
    await emp.populate('designation');
    await emp.populate('reportsTo', 'name empId');

    return res.status(201).json({
      success: true,
      type: 'in',
      message: 'Punch IN successful',
      employee_id: emp._id,
      time: currentTimeString,
      employee_name: emp.name
    });
  } catch (err) {
    console.error('Punch IN error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
}

// Handle Punch OUT
async function handlePunchOut(emp, attendanceIndex, now, currentTimeString, res) {
  try {
    const attendance = emp.attendance[attendanceIndex];
    
    // Parse in time
    const [inHours, inMinutes, inSeconds] = attendance.inTime.split(':').map(Number);
    const [outHours, outMinutes, outSeconds] = currentTimeString.split(':').map(Number);

    const inTotalMinutes = inHours * 60 + inMinutes;
    const outTotalMinutes = outHours * 60 + outMinutes;
    
    let totalMinutes = outTotalMinutes - inTotalMinutes;
    
    // Handle overnight shift (punch out next day)
    if (totalMinutes < 0) {
      totalMinutes += 24 * 60;
    }

    const totalHours = parseFloat((totalMinutes / 60).toFixed(2));
    const shiftHours = emp.workHours ? parseInt(emp.workHours) : 8;

    let regularHours = 0;
    let overtimeHours = 0;

    if (totalHours <= shiftHours) {
      regularHours = totalHours;
      overtimeHours = 0;
    } else {
      regularHours = shiftHours;
      overtimeHours = parseFloat((totalHours - shiftHours).toFixed(2));
    }

    // Update attendance record
    attendance.outTime = currentTimeString;
    attendance.totalHours = totalHours;
    attendance.regularHours = regularHours;
    attendance.overtimeHours = overtimeHours;
    attendance.punchLogs.push({
      punchType: 'OUT',
      punchTime: now
    });
    attendance.note = `Punch OUT via barcode scanner | Total: ${totalHours}h | Regular: ${regularHours}h | OT: ${overtimeHours}h`;

    await emp.save();

    // Re-populate
    await emp.populate('headDepartment');
    await emp.populate('subDepartment');
    await emp.populate('group');
    await emp.populate('designation');
    await emp.populate('reportsTo', 'name empId');

    return res.status(200).json({
      success: true,
      type: 'out',
      message: 'Punch OUT successful',
      employee_id: emp._id,
      time: currentTimeString,
      employee_name: emp.name,
      total_hours: totalHours,
      regular_hours: regularHours,
      overtime_hours: overtimeHours
    });
  } catch (err) {
    console.error('Punch OUT error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
}