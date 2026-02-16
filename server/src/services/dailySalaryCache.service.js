// import DailySalaryModel from '../models/salary.model/dailySalary.model.js'

// const toDateKey = (d) => {
//   if (!d) return null
//   const date = (d instanceof Date) ? d : new Date(d)
//   if (isNaN(date.getTime())) return null
//   const y = date.getFullYear()
//   const m = String(date.getMonth() + 1).padStart(2, '0')
//   const day = String(date.getDate()).padStart(2, '0')
//   return `${y}-${m}-${day}`
// }

// export async function invalidateByDate(date) {
//   const key = toDateKey(date)
//   if (!key) return
//   try {
//     await DailySalaryModel.deleteOne({ dateKey: key })
//   } catch (err) {
//     console.error('Failed to invalidate daily cache for', key, err)
//   }
// }

// export async function invalidateByDates(dates = []) {
//   const keys = dates.map(toDateKey).filter(Boolean)
//   if (!keys.length) return
//   try {
//     await DailySalaryModel.deleteMany({ dateKey: { $in: keys } })
//   } catch (err) {
//     console.error('Failed to invalidate daily cache for keys', keys, err)
//   }
// }

// export async function invalidateAll() {
//   try {
//     await DailySalaryModel.deleteMany({})
//   } catch (err) {
//     console.error('Failed to clear daily salary cache', err)
//   }
// }

// export default { invalidateByDate, invalidateByDates, invalidateAll }
