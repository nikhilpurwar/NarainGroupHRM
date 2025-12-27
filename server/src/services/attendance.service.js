import Attendance from '../models/attendance.model.js'
import BreakTime from '../models/setting.model/breaktime.model.js'
import createHttpError from 'http-errors'

// Configurable business rules
const DEFAULT_CONFIG = {
  absentMarkingCutoffMinutes: 60 * 24, // by default consider past-day cutoff (can be overridden)
  PUNCH_DEBOUNCE_SECONDS: 10, // debounce within 10 seconds
  ATTENDANCE_DAY_START_HOUR: 7, // attendance day starts at 7 AM
}

// In-memory debounce cache: employeeId => { lastPunchTime, lastPunchType }
const punchDebounceCache = new Map();

export const isPunchDuplicate = (employeeId, punchType) => {
  const now = new Date();
  const cached = punchDebounceCache.get(employeeId);
  
  if (!cached) return false;
  
  const timeDiffSeconds = (now - cached.lastPunchTime) / 1000;
  const isDuplicate = timeDiffSeconds < DEFAULT_CONFIG.PUNCH_DEBOUNCE_SECONDS && cached.lastPunchType === punchType;
  
  return isDuplicate;
};

export const recordPunch = (employeeId, punchType) => {
  punchDebounceCache.set(employeeId, {
    lastPunchTime: new Date(),
    lastPunchType: punchType
  });
};

export const clearPunchCache = (employeeId) => {
  punchDebounceCache.delete(employeeId);
};

export const buildDateRange = (year, month) => {
  const start = new Date(`${year}-${String(month).padStart(2, '0')}-01T00:00:00Z`)
  const end = new Date(start)
  end.setMonth(end.getMonth() + 1)
  end.setSeconds(end.getSeconds() - 1)
  return { start, end }
}

export async function findAttendanceByEmployeeAndDate(employeeId, date, projection = null) {
  const start = new Date(date + 'T00:00:00Z')
  const end = new Date(date + 'T23:59:59Z')
  return Attendance.findOne({ employee: employeeId, date: { $gte: start, $lte: end } }, projection).lean()
}

export async function findIncompleteAttendance(employeeId) {
  // Find the most recent attendance whose last punch log is an IN (i.e. waiting for OUT)
  // Use $expr + $arrayElemAt to inspect last element of punchLogs.punchType
  return Attendance.findOne({
    employee: employeeId,
    $expr: { $eq: [ { $arrayElemAt: ["$punchLogs.punchType", -1] }, "IN" ] }
  }).sort({ date: -1, createdAt: -1 });
}

// Cache for boundary hour (minutes TTL)
let _boundaryCache = { hour: null, ts: 0 }
export async function getBoundaryHour() {
  // return cached if within 5 minutes
  const now = Date.now()
  if (_boundaryCache.hour !== null && (now - _boundaryCache.ts) < 5 * 60 * 1000) return _boundaryCache.hour
  try {
    const bt = await BreakTime.findOne({ status: 1 }).sort({ createdAt: -1 }).lean()
    // prefer explicit shiftStart, breakInTime, inTime or timestart
    let val = bt?.shiftStart || bt?.breakInTime || bt?.inTime || bt?.timestart || bt?.timeStart || null
    if (!val) {
      _boundaryCache = { hour: (DEFAULT_CONFIG.ATTENDANCE_DAY_START_HOUR || 7), ts: now }
      return _boundaryCache.hour
    }
    // extract hour number
    const m = String(val).trim().match(/(\d{1,2})/) 
    const hour = m ? Number(m[1]) : (DEFAULT_CONFIG.ATTENDANCE_DAY_START_HOUR || 7)
    _boundaryCache = { hour, ts: now }
    return hour
  } catch (err) {
    _boundaryCache = { hour: (DEFAULT_CONFIG.ATTENDANCE_DAY_START_HOUR || 7), ts: now }
    return _boundaryCache.hour
  }
}

// Return aggregated shift configuration from BreakTime (boundary hour and shift length)
let _shiftConfigCache = { cfg: null, ts: 0 }
export async function getShiftConfig() {
  const now = Date.now()
  if (_shiftConfigCache.cfg && (now - _shiftConfigCache.ts) < 5 * 60 * 1000) return _shiftConfigCache.cfg
  try {
    const bt = await BreakTime.findOne({ status: 1 }).sort({ createdAt: -1 }).lean()
    const shiftStart = bt?.shiftStart || bt?.breakInTime || bt?.inTime || bt?.timestart || null
    const shiftEnd = bt?.shiftEnd || bt?.breakOutTime || bt?.outTime || null
    const shiftHours = (typeof bt?.shiftHour === 'number' && bt.shiftHour > 0) ? bt.shiftHour : (DEFAULT_CONFIG.ATTENDANCE_DAY_START_HOUR ? 8 : 8)
    const boundaryHour = await getBoundaryHour()
    const cfg = { shiftStart, shiftEnd, shiftHours, boundaryHour }
    _shiftConfigCache = { cfg, ts: now }
    return cfg
  } catch (err) {
    return { shiftStart: null, shiftEnd: null, shiftHours: 8, boundaryHour: (DEFAULT_CONFIG.ATTENDANCE_DAY_START_HOUR || 7) }
  }
}

// Determine attendance ISO (YYYY-MM-DD) for a timestamp using configured boundary hour
export async function getAttendanceIsoForTimestamp(ts) {
  const timeZone = process.env.ATTENDANCE_TIMEZONE || 'Asia/Kolkata';
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date(ts)).reduce((acc, p) => {
    if (p.type === 'year') acc.year = Number(p.value);
    if (p.type === 'month') acc.month = Number(p.value);
    if (p.type === 'day') acc.day = Number(p.value);
    if (p.type === 'hour') acc.hour = Number(p.value);
    return acc;
  }, { year: 0, month: 0, day: 0, hour: 0 });
  const { year, month, day, hour } = parts;
  let baseYear = year;
  let baseMonth = month;
  let baseDay = day;
  const boundary = await getBoundaryHour()
  if (hour < boundary) {
    const dt = new Date(Date.UTC(year, month - 1, day));
    dt.setUTCDate(dt.getUTCDate() - 1);
    baseYear = dt.getUTCFullYear();
    baseMonth = dt.getUTCMonth() + 1;
    baseDay = dt.getUTCDate();
  }
  const mm = String(baseMonth).padStart(2, '0');
  const dd = String(baseDay).padStart(2, '0');
  return `${baseYear}-${mm}-${dd}`;
}

export async function createAttendance(payload) {
  try {
    const doc = await Attendance.create(payload)
    return doc
  } catch (err) {
    if (err.code === 11000) throw createHttpError.Conflict('Duplicate attendance record')
    throw err
  }
}

export async function updateAttendance(attendanceDoc, updates = {}) {
  Object.assign(attendanceDoc, updates)
  return attendanceDoc.save()
}

export async function bulkUpsertAttendances(items = [], options = {}) {
  if (!Array.isArray(items) || items.length === 0) return []
  const ops = items.map(it => {
    const dateIso = new Date(it.date).toISOString().slice(0, 10)
    return {
      updateOne: {
        filter: { employee: it.employee, date: { $gte: new Date(`${dateIso}T00:00:00Z`), $lte: new Date(`${dateIso}T23:59:59Z`) } },
        update: { $set: it },
        upsert: true,
      }
    }
  })
  const res = await Attendance.bulkWrite(ops, { ordered: false })
  return res
}

// Compute totals and last in/out from an array of punch logs
// Returns { totalHours, regularHours, overtimeHours, lastInTime, lastOutTime, pairs }
export function computeTotalsFromPunchLogs(punchLogs = [], shiftHours = 8, { countOpenAsNow = false, now = new Date() } = {}) {
  if (!Array.isArray(punchLogs) || punchLogs.length === 0) {
    return { totalHours: 0, regularHours: 0, overtimeHours: 0, lastInTime: null, lastOutTime: null, pairs: [] }
  }

  // Ensure punchLogs are sorted by time asc
  const logs = (punchLogs || []).slice().sort((a, b) => new Date(a.punchTime) - new Date(b.punchTime));
  const pairs = [];
  let currentIn = null;
  let lastInTime = null;
  let lastOutTime = null;
  let totalMinutes = 0;

  for (const lg of logs) {
    const type = (lg.punchType || '').toUpperCase();
    const t = new Date(lg.punchTime);
    if (type === 'IN') {
      currentIn = t;
      lastInTime = t;
    } else if (type === 'OUT') {
      if (currentIn) {
        // pair and accumulate
        let mins = Math.round((t - currentIn) / 60000);
        if (mins < 0) mins = mins + 24 * 60; // handle overnight
        totalMinutes += mins;
        pairs.push({ in: currentIn, out: t, minutes: mins, hours: +(mins / 60).toFixed(2) });
        lastOutTime = t;
        currentIn = null;
      } else {
        // OUT without IN: ignore or could record as anomaly
        lastOutTime = t;
      }
    }
  }

  // If there's an open IN and caller wants to count till now
  if (currentIn && countOpenAsNow) {
    let mins = Math.round((now - currentIn) / 60000);
    if (mins < 0) mins = mins + 24 * 60;
    totalMinutes += mins;
    pairs.push({ in: currentIn, out: now, minutes: mins, hours: +(mins / 60).toFixed(2) });
    lastOutTime = now;
  }

  const totalHours = +(totalMinutes / 60).toFixed(2);
  const shift = Number(shiftHours) || 8;
  const regularHours = totalHours <= shift ? totalHours : shift;
  const overtimeHours = totalHours > shift ? +(totalHours - shift).toFixed(2) : 0;

  // Helper: format minutes into "Xh Ym" string
  const formatMinutes = (mins) => {
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return `${h}h ${m}m`;
  }

  return { 
    totalHours, 
    regularHours, 
    overtimeHours, 
    lastInTime, 
    lastOutTime, 
    pairs,
    totalMinutes,
    totalHoursDisplay: formatMinutes(totalMinutes),
    regularHoursDisplay: formatMinutes(Math.round(regularHours * 60)),
    overtimeHoursDisplay: formatMinutes(Math.round(overtimeHours * 60)),
  };
}

export async function getMonthlyAttendances(employeeId, year, month, { page = 1, limit = 100, projection = null } = {}) {
  const { start, end } = buildDateRange(year, month)
  const q = { employee: employeeId, date: { $gte: start, $lte: end } }
  const skip = (page - 1) * limit
  const docs = await Attendance.find(q, projection).sort({ date: 1 }).skip(skip).limit(limit).lean()
  const total = await Attendance.countDocuments(q)
  return { docs, total, page, limit }
}

export async function autoMarkAbsentsForMonth(employeeId, year, month, { skipWeekends = true, minDate = null } = {}) {
  const { start, end } = buildDateRange(year, month)
  const days = []
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) days.push(new Date(d))

  const created = []
  for (const day of days) {
    const iso = day.toISOString().slice(0, 10)
    const dayOfWeek = day.getDay()
    if (skipWeekends && (dayOfWeek === 0 || dayOfWeek === 6)) continue
    if (minDate && day < new Date(minDate)) continue

    const existing = await Attendance.findOne({ employee: employeeId, date: { $gte: new Date(`${iso}T00:00:00Z`), $lte: new Date(`${iso}T23:59:59Z`) } })
    if (!existing) {
      const doc = await Attendance.create({ employee: employeeId, date: day, status: 'absent', inTime: null, outTime: null, totalHours: 0, regularHours: 0, overtimeHours: 0, punchLogs: [], note: 'Auto-marked absent' })
      created.push(doc)
    }
  }
  return created
}

export default {
  buildDateRange,
  findAttendanceByEmployeeAndDate,
  findIncompleteAttendance,
  createAttendance,
  updateAttendance,
  bulkUpsertAttendances,
  getMonthlyAttendances,
  autoMarkAbsentsForMonth,
  isPunchDuplicate,
  recordPunch,
  clearPunchCache,
  handleContinuousINAcross8AM,
  parseDateTime,
  computeTotalsFromPunchLogs,
}

// Utility: parse a date (YYYY-MM-DD) and time string into a Date object.
export function parseDateTime(dateIso, timeStr) {
  if (!dateIso) return null
  if (!timeStr) return new Date(dateIso + 'T00:00:00Z')
  // Normalize time string to HH:MM:SS 24-hour
  // Support formats: 'HH:MM', 'HH:MM:SS', 'hh:mm:ss AM/PM'
  try {
    let t = timeStr.trim()
    const ampm = /\s?(AM|PM)$/i.exec(t)
    if (ampm) {
      // Convert to 24h
      const parts = t.replace(/\s?(AM|PM)$/i, '').split(':').map(p => p.trim())
      let hh = parseInt(parts[0])
      const mm = parts[1] ? parts[1].padStart(2, '0') : '00'
      const ss = parts[2] ? parts[2].padStart(2, '0') : '00'
      const isPm = /PM/i.test(ampm[0])
      if (isPm && hh < 12) hh += 12
      if (!isPm && hh === 12) hh = 0
      t = `${String(hh).padStart(2,'0')}:${mm}:${ss}`
    } else {
      // Ensure seconds
      const parts = t.split(':')
      if (parts.length === 2) t = `${parts[0].padStart(2,'0')}:${parts[1].padStart(2,'0')}:00`
      if (parts.length === 1) t = `${parts[0].padStart(2,'0')}:00:00`
    }
    const iso = `${dateIso}T${t}Z`
    const dt = new Date(iso)
    if (Number.isNaN(dt.getTime())) return null
    return dt
  } catch (err) {
    return null
  }
}

// Check if employee has open IN that crosses attendance-day boundary to next day
export async function handleContinuousINAcross8AM(employeeId, attendanceIso, Attendance) {
  try {
    // Get attendance for today (computed by configured boundary hour)
    const todayAtt = await Attendance.findOne({
      employee: employeeId,
      date: {
        $gte: new Date(`${attendanceIso}T00:00:00Z`),
        $lte: new Date(`${attendanceIso}T23:59:59Z`)
      }
    });

    if (!todayAtt || !Array.isArray(todayAtt.punchLogs) || todayAtt.punchLogs.length === 0) {
      return null;
    }

    // Check if last punch is IN
    const lastPunch = todayAtt.punchLogs[todayAtt.punchLogs.length - 1];
    if (!lastPunch || lastPunch.punchType !== 'IN') {
      return null;
    }

    // Get last IN time
    const lastInTime = new Date(lastPunch.punchTime);
    const lastInHour = lastInTime.getHours();

    // If IN was before configured boundary hour (assigned to previous day), check if it should span to today
    const boundaryHour = await getBoundaryHour()
    if (lastInHour < boundaryHour && attendanceIso !== lastInTime.toISOString().slice(0, 10)) {
      // IN was yesterday before boundary hour, and we're now computing today
      // This means employee was IN from yesterday before the boundary hour and is still IN today
      // Mark today as Present automatically
      const nextDayIso = attendanceIso;
      const nextDayDateObj = new Date(`${nextDayIso}T00:00:00Z`);
      const nextDayOfWeek = nextDayDateObj.getDay();
      const nextDayIsWeekend = nextDayOfWeek === 0 || nextDayOfWeek === 6;

      let nextDayAtt = await Attendance.findOne({
        employee: employeeId,
        date: {
          $gte: new Date(`${nextDayIso}T00:00:00Z`),
          $lte: new Date(`${nextDayIso}T23:59:59Z`)
        }
      });

      if (!nextDayAtt) {
        // Create new attendance for next day with IN at configured boundary hour
        nextDayAtt = await Attendance.create({
          employee: employeeId,
          date: nextDayDateObj,
          status: 'present',
          inTime: `${String(boundaryHour).padStart(2,'0')}:00:00`,
          outTime: null,
          totalHours: 0,
          regularHours: 0,
          overtimeHours: 0,
          breakMinutes: 0,
          isWeekend: nextDayIsWeekend,
          isHoliday: false,
          punchLogs: [{ 
            punchType: 'IN', 
            punchTime: new Date(`${nextDayIso}T${String(boundaryHour).padStart(2,'0')}:00:00Z`)
          }],
          note: `Continuous IN from previous day (auto-marked at ${String(boundaryHour).padStart(2,'0')}:00 boundary)`
        });
      }

      return { marked: true, nextDayAttendance: nextDayAtt };
    }

    return null;
  } catch (err) {
    console.error('Error handling continuous IN:', err);
    return null;
  }
}
