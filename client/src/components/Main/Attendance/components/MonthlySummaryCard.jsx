import React from 'react'
import { CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react'

// summary: backend monthly summary document
// days/table/holidays: optional props used to recompute counts so UI matches grid
const MonthlySummaryCard = ({ summary, isMobile, days = [], table = {}, holidays = [], employee = null }) => {
    if (!summary && (!table || !days.length)) return null

    const isHoliday = (isoDate) => {
        if (!isoDate) return false
        return (holidays || []).some(h => {
            const hDate = h.date ? (typeof h.date === 'string' ? h.date.split('T')[0] : h.date.toISOString().slice(0, 10)) : null
            return hDate === isoDate
        })
    }

    // Derive month/year label from selected report
    let monthLabel = ''
    let yearLabel = ''
    if (days && days.length && days[0]?.iso) {
        const d0 = new Date(days[0].iso)
        monthLabel = d0.toLocaleString('default', { month: 'long' })
        yearLabel = String(d0.getFullYear())
    } else if (summary?.year && summary?.month) {
        const d0 = new Date(summary.year, (summary.month || 1) - 1, 1)
        monthLabel = d0.toLocaleString('default', { month: 'long' })
        yearLabel = String(d0.getFullYear())
    }

    // Derive present/absent counts from the Status row so card always
    // matches what the attendance grid shows (ignoring holidays)
    // let computedPresent = 0
    // let computedAbsent = 0

    // Determine employee created/join date (if provided in summary) so
    // absents before join are not counted. Try common field names.
    // Prefer explicit `employee` prop if provided, otherwise fall back to fields on `summary`.
    const createdAtCandidate = employee?.createdAt || summary?.employee?.createdAt || summary?.createdAt || summary?.joinDate || summary?.joinedAt || summary?.dateJoined || summary?.employeeCreatedAt || null
    let createdDate = null
    if (createdAtCandidate) {
        const dstr = typeof createdAtCandidate === 'string' ? createdAtCandidate.split('T')[0] : (createdAtCandidate instanceof Date ? createdAtCandidate.toISOString().slice(0,10) : String(createdAtCandidate))
        createdDate = new Date(dstr)
        createdDate.setHours(0,0,0,0)
    }

    // if (table && days && days.length && table['Status']) {
    //     const statusRow = table['Status'] || []
    //     const today = new Date()
    //     today.setHours(0, 0, 0, 0)

    //     for (let i = 0; i < days.length; i++) {
    //         const d = days[i]
    //         const iso = d.iso
    //         const dayDate = new Date(iso)
    //         dayDate.setHours(0, 0, 0, 0)
    //         const dayOfWeek = dayDate.getDay()
    //         const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
    //         const holiday = isHoliday(iso)

    //         // Ignore days before the employee joined
    //         if (createdDate && dayDate < createdDate) continue

    //         const rawStatus = statusRow[i]
    //         if (!rawStatus) continue
    //         if (holiday) continue

    //         const st = String(rawStatus).toLowerCase()
    //         // Treat halfday as present for UI summary, like the grid header
    //         if (st === 'present' || st === 'halfday') computedPresent++
    //         else if (st === 'absent') computedAbsent++
    //     }
    // }
const totalPresent = summary?.totalPresent || 0
const totalAbsent  = summary?.totalAbsent  || 0

    // Derive worked / regular / OT hours from the table so it always
    // matches what the grid shows (manual + punch + scanner), and only
    // fall back to backend summary if table data is missing.
    let workedFromTable = 0
    let regularFromTable = 0
    let otFromTable = 0

    const parseHoursCell = (cell) => {
        if (!cell && cell !== 0) return 0
        if (typeof cell === 'number') return cell
        const s = String(cell).trim()
        if (!s) return 0

        // Pattern like "8h 30m" or "9h"
        const match = s.match(/(\d+)\s*h(?:\s*(\d+)\s*m)?/i)
        if (match) {
            const h = parseInt(match[1], 10) || 0
            const m = match[2] ? parseInt(match[2], 10) || 0 : 0
            return h + m / 60
        }

        const num = parseFloat(s)
        return Number.isNaN(num) ? 0 : num
    }

    if (table && days && days.length) {
        const workedRow = table['Worked Hours'] || []
        const regularRow = table['Regular Hours'] || []
        const otRow = table['OT (Hours)'] || []

        for (let i = 0; i < days.length; i++) {
            workedFromTable += parseHoursCell(workedRow[i])
            regularFromTable += parseHoursCell(regularRow[i])
            otFromTable += parseHoursCell(otRow[i])
        }
    }

    const totalHoursWorked = workedFromTable || Number(summary?.totalHoursWorked || 0)
    const totalOvertimeHours = otFromTable || Number(summary?.totalOvertimeHours || 0)
    const totalRegularHours = regularFromTable || Math.max(0, totalHoursWorked - totalOvertimeHours)

    const formatHours = (hours) => {
        const totalMinutes = Math.round((Number(hours) || 0) * 60)
        const h = Math.floor(totalMinutes / 60)
        const m = totalMinutes % 60
        return `${h}h ${m}m`
    }

    const cards = [
        {
            title: 'Total Present',
            value: totalPresent,
            icon: CheckCircle,
            color: 'bg-green-100 border-green-500 text-green-700',
            iconColor: 'text-green-600'
        },
        {
            title: 'Total Absent',
            value: totalAbsent,
            icon: XCircle,
            color: 'bg-red-100 border-red-500 text-red-700',
            iconColor: 'text-red-600'
        },
        {
            title: 'Total Worked Hours',
            value: formatHours(totalHoursWorked),
            icon: Clock,
            color: 'bg-blue-100 border-blue-500 text-blue-700',
            iconColor: 'text-blue-600'
        },
        {
            title: 'Regular Hours',
            value: formatHours(totalRegularHours),
            icon: TrendingUp,
            color: 'bg-purple-100 border-purple-500 text-purple-700',
            iconColor: 'text-purple-600'
        },
        {
            title: 'OT Hours',
            value: formatHours(totalOvertimeHours),
            icon: TrendingUp,
            color: 'bg-orange-100 border-orange-500 text-orange-700',
            iconColor: 'text-orange-600'
        }
    ]

    if (isMobile) {
        return (
            <div className="card-hover bg-white rounded-lg shadow p-4 mb-4">
                <h3 className="text-sm font-semibold text-gray-700">Monthly Summary</h3>
                {monthLabel && (
                    <div className="text-[11px] text-gray-500 mb-3">Selected month: {monthLabel} {yearLabel}</div>
                )}
                <div className="grid grid-cols-2 gap-2">
                    {cards.map((card, idx) => {
                        const Icon = card.icon
                        return (
                            <div
                                key={idx}
                                className={`${card.color} rounded-lg p-2 border-l-4`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <Icon size={16} className={card.iconColor} />
                                </div>
                                <div className="text-lg font-bold">{card.value}</div>
                                <div className="text-xs opacity-75">{card.title}</div>
                            </div>
                        )
                    })}
                </div>
            </div>
        )
    }

    return (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-b-xl shadow p-4 sm:p-6 mb-6 border border-blue-200">
            <div className="flex items-baseline justify-between mb-4">
                <h3 className="text-base font-semibold text-gray-700">Monthly Summary</h3>
                {monthLabel && (
                    <span className="text-xs text-gray-500">Selected month: {monthLabel} {yearLabel}</span>
                )}
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {cards.map((card, idx) => {
                    const Icon = card.icon
                    return (
                        <div
                            key={idx}
                            className={`${card.color} flex items-center justify-between mb-2 rounded-lg p-4 border-l-4 hover:shadow-md transition`}
                        >
                            <div>
                                <div className="text-2xl font-bold">{card.value}</div>
                                <div className="text-sm opacity-75 mt-1">{card.title}</div>
                            </div>
                            <Icon size={40} className={`${card.iconColor} mr-6`} />
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

export default MonthlySummaryCard
