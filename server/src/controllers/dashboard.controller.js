import Employee from "../models/employee.model.js";
import Attendance from "../models/attendance.model.js";
import { HeadDepartment, SubDepartment } from "../models/department.model.js";
import Holiday from "../models/setting.model/holidays.model.js";

export const dashboardSummary = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // ================= EMPLOYEES =================
    const totalEmployees = await Employee.countDocuments();
    const activeEmployees = await Employee.countDocuments({ status: "active" });
    const inactiveEmployees = await Employee.countDocuments({ status: "inactive" });

    // ================= ATTENDANCE TODAY =================
    const attendanceToday = await Attendance.find({
      date: { $gte: today, $lt: tomorrow },
    });

   let present = 0, absent = 0, onLeave = 0;

const inSet = new Set();
const outSet = new Set();

attendanceToday.forEach(a => {
  if (a.status === "present") present++;
  else if (a.status === "absent") absent++;
  else if (a.status === "leave") onLeave++;

  a.punchLogs?.forEach(p => {
    const empId = a.employee.toString();

    if (p.punchType === "IN") {
      inSet.add(empId);
      outSet.delete(empId);
    }

    if (p.punchType === "OUT") {
      outSet.add(empId);
      inSet.delete(empId);
    }
  });
});

const inEmployees = inSet.size;
const outEmployees = outSet.size;


    // ================= DEPARTMENTS =================
    const headDepartments = await HeadDepartment.find().select("name").lean();
    const departmentCards = [];

    for (const dept of headDepartments) {
      const subDepts = await SubDepartment.find({ headDepartment: dept._id }).lean();

      let headPresent = 0;
      let headAbsent = 0;
      let headTotalEmployees = 0;

      const subDeptCards = [];

      for (const sub of subDepts) {
        const employees = await Employee.find({ subDepartment: sub._id }).select("_id");
        headTotalEmployees += employees.length;

        const employeeIds = employees.map(e => e._id);

        const attendance = await Attendance.find({
          employee: { $in: employeeIds },
          date: { $gte: today, $lt: tomorrow },
        });

        const presentCount = attendance.filter(a => a.status === "present").length;
        const absentCount = attendance.filter(a => a.status === "absent").length;

        headPresent += presentCount;
        headAbsent += absentCount;

        subDeptCards.push({
          _id: sub._id,
          name: sub.name,
          present: presentCount,
          absent: absentCount,
        });
      }

      departmentCards.push({
        _id: dept._id,
        name: dept.name,
        totalEmployees: headTotalEmployees,
        present: headPresent,
        absent: headAbsent,
        subDepartments: subDeptCards,
      });
    }
    
    // Last 7 days attendance trend
    const last7Days = [];
    const attendanceTrend = [];

    for (let i = 6; i >= 0; i--) {
      const day = new Date();
      day.setDate(today.getDate() - i);
      day.setHours(0, 0, 0, 0);

      const nextDay = new Date(day);
      nextDay.setDate(day.getDate() + 1);

      const dayAttendance = await Attendance.find({
        date: { $gte: day, $lt: nextDay },
      });

      const presentCount = dayAttendance.filter(a => a.status === "present").length;
      const absentCount = dayAttendance.filter(a => a.status === "absent").length;

      last7Days.push(day.toLocaleDateString("en-US", { weekday: "short" }));
      attendanceTrend.push({ present: presentCount, absent: absentCount });
    }
    
    // 6 Upcoming holidays (next 30 days)
    const next30 = new Date();
    next30.setDate(today.getDate() + 30);
    next30.setHours(23, 59, 59, 999);

    const upcomingHolidaysRaw = await Holiday.find({
      date: { $gte: today, $lte: next30 },
    }).sort({ date: 1 }).lean();

    const upcomingHolidays = upcomingHolidaysRaw.map(h => ({
      _id: h._id,
      name: h.name,
      date: h.date,
      description: h.description,
      createdAt: h.createdAt,
    }));

    // ================= RECENT EMPLOYEES =================
   const recentEmployeesRaw = await Employee.find()
  .sort({ createdAt: -1 })
  .limit(5)
  .populate("subDepartment", "name");

const recentEmployees = recentEmployeesRaw.map(emp => {
  const todayAttendance = attendanceToday.find(
    a => a.employee._id.toString() === emp._id.toString()
  );

  return {
    _id: emp._id,
    name: emp.name,
    subDepartmentName: emp.subDepartment?.name || "N/A",
    status: todayAttendance?.status === "present" ? "present" : "absent",
  };
});

// month


    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 1);

const monthlyAttendance = await Attendance.find({
  date: { $gte: monthStart, $lt: monthEnd },
});

let monthlyPresent = 0;
let monthlyAbsent = 0;

const monthlyInSet = new Set();
const monthlyOutSet = new Set();

monthlyAttendance.forEach(a => {
  if (a.status === "present") monthlyPresent++;
  if (a.status === "absent") monthlyAbsent++;

  a.punchLogs?.forEach(p => {
    if (p.punchType === "IN") monthlyInSet.add(a.employee.toString());
    if (p.punchType === "OUT") monthlyOutSet.add(a.employee.toString());
  });
});

const monthlyIn = monthlyInSet.size;
const monthlyOut = monthlyOutSet.size;


res.json({
  totalEmployees,
  activeEmployees,
  inactiveEmployees,

  presentToday: present,
  absentToday: absent,
  onLeaveToday: onLeave,
  inEmployees,
  outEmployees,
  recentEmployees,

  monthly: {
    present: monthlyPresent,
    absent: monthlyAbsent,
    inEmployees: monthlyIn,
    outEmployees: monthlyOut,
  },
    attendanceTrend: {
        labels: last7Days,
        datasets: attendanceTrend,
      },
      upcomingHolidays,
  departments: departmentCards,
});


  } catch (err) {
    console.error("Dashboard Error:", err);
    res.status(500).json({ error: "Server Error" });
  }
};
