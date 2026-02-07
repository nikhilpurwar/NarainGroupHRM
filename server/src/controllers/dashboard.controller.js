import Employee from "../models/employee.model.js";
import Attendance from "../models/attendance.model.js";
import { HeadDepartment, SubDepartment } from "../models/department.model.js";
import Holiday from "../models/setting.model/holidays.model.js";
import MonthlySummary from "../models/monthlySummary.model.js";

export const dashboardSummary = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    /* ================= RUN PARALLEL QUERIES ================= */
    const [
      totalEmployees,
      activeEmployees,
      inactiveEmployees,
      attendanceToday,
      headDepartments,
      subDepartments,
      activeEmployeesList,
      recentEmployeesRaw,
      monthlySummaries,
      upcomingHolidaysRaw,
    ] = await Promise.all([
      Employee.countDocuments(),
      Employee.countDocuments({ status: "active" }),
      Employee.countDocuments({ status: "inactive" }),

      Attendance.find(
  { date: { $gte: today, $lt: tomorrow } },
  { employee: 1, status: 1, punchLogs: 1 },
  
).lean(),

      HeadDepartment.find().select("name").lean(),
      SubDepartment.find().select("name headDepartment").lean(),

      Employee.find({ status: "active" })
        .select("_id subDepartment")
        .lean(),

      Employee.find({ status: "active" })
  .select("_id name empId subDepartment") // ✅ ADD empId
  .sort({ createdAt: -1 })
  .limit(5)
  .populate("subDepartment", "name")
  .lean(),

      MonthlySummary.find({
        year: today.getFullYear(),
        month: today.getMonth() + 1,
      }).lean(),

      Holiday.find({
        date: {
          $gte: today,
          $lte: new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000),
        },
      })
        .sort({ date: 1 })
        .lean(),
    ]);

    /* ================= ATTENDANCE TODAY ================= */
    let present = 0, absent = 0, onLeave = 0;
    const inSet = new Set();
    const outSet = new Set();

    attendanceToday.forEach(a => {
      if (a.status === "present") present++;
      else if (a.status === "absent") absent++;
      else if (a.status === "leave") onLeave++;

      a.punchLogs?.forEach(p => {
        const empId = String(a.employee);
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

    /* ================= FAST LOOKUP MAPS ================= */
    const attendanceMap = new Map();
    attendanceToday.forEach(a => {
      attendanceMap.set(String(a.employee), a.status);
    });

    const employeesBySubDept = new Map();
    activeEmployeesList.forEach(e => {
      const key = String(e.subDepartment);
      if (!employeesBySubDept.has(key)) {
        employeesBySubDept.set(key, []);
      }
      employeesBySubDept.get(key).push(String(e._id));
    });

    const todayAttendanceByEmp = new Map();
    attendanceToday.forEach(a => {
      todayAttendanceByEmp.set(String(a.employee), a.status);
    });

    /* ================= DEPARTMENTS ================= */
    const departmentCards = headDepartments.map(dept => {
      const subs = subDepartments.filter(
        s => String(s.headDepartment) === String(dept._id)
      );

      let headPresent = 0;
      let headAbsent = 0;
      let headTotalEmployees = 0;

      const subDeptCards = subs.map(sub => {
        const empIds = employeesBySubDept.get(String(sub._id)) || [];
        const totalEmployees = empIds.length;
        headTotalEmployees += totalEmployees;

        let presentCount = 0;
        let absentCount = 0;

        empIds.forEach(id => {
          const st = todayAttendanceByEmp.get(id);
          if (st === "present") presentCount++;
          else if (st === "absent") absentCount++;
        });

        headPresent += presentCount;
        headAbsent += absentCount;

        return {
          _id: sub._id,
          name: sub.name,
          totalEmployees,
          present: presentCount,
          absent: absentCount,
        };
      });

      return {
        _id: dept._id,
        name: dept.name,
        totalEmployees: headTotalEmployees,
        present: headPresent,
        absent: headAbsent,
        subDepartments: subDeptCards,
      };
    });

 /* ================= LAST 7 DAYS TREND ================= */

const start7Days = new Date(today);
start7Days.setDate(today.getDate() - 6);

const startYear = new Date(today.getFullYear(), 0, 1);

const trendData = await Attendance.aggregate([
  {
    $match: {
      date: { $gte: startYear, $lt: tomorrow }
    }
  },
  {
    $group: {
      _id: {
        year: { $year: "$date" },
        month: { $month: "$date" },
        day: { $dayOfMonth: "$date" },
        status: "$status"
      },
      count: { $sum: 1 }
    }
  }
]);

const buildTrend = (rangeDays) => {
  const arr = [];

  for (let i = rangeDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);

    const present = trendData.filter(t =>
      t._id.day === d.getDate() &&
      t._id.month === d.getMonth() + 1 &&
      t._id.year === d.getFullYear() &&
      t._id.status === "present"
    ).reduce((a, b) => a + b.count, 0);

    arr.push({
      label: d.toLocaleDateString("en-US", {
        day: "2-digit",
        month: "short"
      }),
      value: present
    });
  }

  return arr;
};

const sevenDayTrend = buildTrend(7);

const monthlyTrend = [];

for (let i = 11; i >= 0; i--) {
  const d = new Date(today);
  d.setMonth(today.getMonth() - i);

  const month = d.getMonth() + 1;
  const year = d.getFullYear();

  const present = trendData.filter(t =>
    t._id.month === month &&
    t._id.year === year &&
    t._id.status === "present"
  ).reduce((a, b) => a + b.count, 0);

  monthlyTrend.push({
    label: d.toLocaleString("en-US", { month: "short", year: "2-digit" }),
    value: present
  });
}

const yearlyTrend = [];

for (let y = today.getFullYear() - 4; y <= today.getFullYear(); y++) {
  const present = trendData.filter(t =>
    t._id.year === y && t._id.status === "present"
  ).reduce((a, b) => a + b.count, 0);

  yearlyTrend.push({
    label: String(y),
    value: present
  });
}


// RECENT EMPLOYEES

const recentEmployees = recentEmployeesRaw.map(emp => {
  const attendanceStatus = attendanceMap.get(String(emp._id));

  const shiftEnd = emp.shiftEnd
    ? new Date(`${now.toDateString()} ${emp.shiftEnd}`)
    : null;

  let status = "pending";

  if (attendanceStatus === "present") {
    status = "present";
  } 
  else if (attendanceStatus === "out") {
    status = "out";
  } 
  else if (shiftEnd && now >= shiftEnd) {
    status = "absent";
  }

  return {
    _id: emp._id,
    empId: emp.empId,
    name: emp.name,
    subDepartmentName: emp.subDepartment?.name || "N/A",
    shiftEnd: emp.shiftEnd, // optional but good
    status,
  };
});

         

    /* ================= MONTHLY ================= */
    const monthly = monthlySummaries.reduce(
      (acc, s) => {
        acc.present += s.totalPresent || 0;
        acc.absent += s.totalAbsent || 0;
        return acc;
      },
      { present: 0, absent: 0 }
    );

    /* ================= RESPONSE ================= */
    res.json({
      totalEmployees,
      activeEmployees,
      inactiveEmployees,
      presentToday: present,
      absentToday: absent,
      onLeaveToday: onLeave,
      inEmployees: inSet.size,
      outEmployees: outSet.size,
      recentEmployees,
      monthly,
      attendanceTrend: {


         sevenDay: sevenDayTrend,
  monthly: monthlyTrend,
  yearly: yearlyTrend
      },
      upcomingHolidays: upcomingHolidaysRaw,
      departments: departmentCards,
    });

  } catch (err) {
    console.error("Dashboard Error:", err);
    res.status(500).json({ error: "Server Error" });
  }
};
