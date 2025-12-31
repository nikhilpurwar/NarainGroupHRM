import React from 'react'
import { CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react'

const MonthlySummaryCard = ({ summary, isMobile }) => {
    if (!summary) return null

    const cards = [
        {
            title: 'Total Present',
            value: summary.totalPresent || 0,
            icon: CheckCircle,
            color: 'bg-green-100 border-green-500 text-green-700',
            iconColor: 'text-green-600'
        },
        {
            title: 'Total Absent',
            value: summary.totalAbsent || 0,
            icon: XCircle,
            color: 'bg-red-100 border-red-500 text-red-700',
            iconColor: 'text-red-600'
        },
        {
            title: 'Working Days',
            value: summary.totalWorkingDays || 0,
            icon: Clock,
            color: 'bg-blue-100 border-blue-500 text-blue-700',
            iconColor: 'text-blue-600'
        },
        {
            title: 'Hours Worked',
            value: (summary.totalHoursWorked || 0).toFixed(1) + 'h',
            icon: TrendingUp,
            color: 'bg-purple-100 border-purple-500 text-purple-700',
            iconColor: 'text-purple-600'
        }
    ]

    if (isMobile) {
        return (
            <div className="bg-white rounded-lg shadow p-4 mb-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Monthly Summary</h3>
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
            <h3 className="text-base font-semibold text-gray-700 mb-4">Monthly Summary</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
