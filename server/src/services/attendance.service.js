import Attendance from '../models/attendance.model.js'
import createHttpError from 'http-errors'

// Configurable business rules
const DEFAULT_CONFIG = {
  absentMarkingCutoffMinutes: 60 * 24, // by default consider past-day cutoff (can be overridden)
}

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

  return { totalHours, regularHours, overtimeHours, lastInTime, lastOutTime, pairs };
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
