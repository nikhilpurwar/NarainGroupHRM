import dotenv from 'dotenv'
dotenv.config()
import mongoose from 'mongoose'
import connectDB from '../src/config/db.js'
import Employee from '../src/models/employee.model.js'
import Attendance from '../src/models/attendance.model.js'
import { SubDepartment } from '../src/models/department.model.js'

const YEAR = 2025
const MONTH_INDEX = 11 // December (0-based)

const connect = async () => {
  try {
    await connectDB()
  } catch (err) {
    console.error('DB connect failed', err)
    process.exit(1)
  }
}

const clearExistingTestData = async () => {
  const testEmployees = await Employee.find({ empId: { $regex: '^TEST_' } }).select('_id')
  if (testEmployees.length) {
    const ids = testEmployees.map(e => e._id)
    console.log(`Removing ${ids.length} existing TEST_ employees and their attendance...`)
    await Attendance.deleteMany({ employee: { $in: ids } })
    await Employee.deleteMany({ _id: { $in: ids } })
  }
}

const seed = async () => {
  try {
    const subDepts = await SubDepartment.find({})
    if (!subDepts.length) {
      console.error('No SubDepartments found. Run the hierarchy seed first.')
      return
    }

    await clearExistingTestData()

    const employeesToInsert = []
    for (const sd of subDepts) {
      const code = sd.code || sd.name.replace(/\s+/g, '_').toUpperCase().slice(0, 10)
      for (let i = 1; i <= 2; i++) {
        employeesToInsert.push({
          name: `Test ${sd.name} ${i}`,          
          status: 'active',
          headDepartment: sd.headDepartment || null,
          subDepartment: sd._id,
        })
      }
    }

    const createdEmployees = await Employee.insertMany(employeesToInsert)
    console.log(`Created ${createdEmployees.length} test employees.`)

    const attendanceDocs = []
    for (const emp of createdEmployees) {
      for (let day = 1; day <= 31; day++) {
        const date = new Date(YEAR, MONTH_INDEX, day)
        if (date.getMonth() !== MONTH_INDEX) continue // skip overflow days

        const dayOfWeek = date.getDay() // 0 Sun - 6 Sat
        const isWeekend = (dayOfWeek === 0 || dayOfWeek === 6)

        // simple rule: weekdays -> present, weekends -> absent
        if (!isWeekend) {
          const inTime = '09:00:00'
          const outTime = '17:30:00'
          const totalHours = 8.5
          attendanceDocs.push({
            employee: emp._id,
            date,
            status: 'present',
            inTime,
            outTime,
            totalHours,
            regularHours: 8,
            dayOtHours: 0.5,
            isWeekend: false,
            isHoliday: false,
            punchLogs: [
              { punchType: 'IN', punchTime: new Date(YEAR, MONTH_INDEX, day, 9, 0, 0) },
              { punchType: 'OUT', punchTime: new Date(YEAR, MONTH_INDEX, day, 17, 30, 0) }
            ]
          })
        } else {
          attendanceDocs.push({
            employee: emp._id,
            date,
            status: 'absent',
            isWeekend: true,
            isHoliday: false,
          })
        }
      }
    }

    if (attendanceDocs.length) {
      await Attendance.insertMany(attendanceDocs)
      console.log(`Inserted ${attendanceDocs.length} attendance documents for December ${YEAR}.`)
    }

    console.log('✅ Test seed completed.')
  } catch (err) {
    console.error('❌ Error while seeding test data:', err)
  } finally {
    await mongoose.connection.close()
    console.log('🔌 DB connection closed.')
  }
}

connect().then(() => seed())
