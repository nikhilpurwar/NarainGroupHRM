import dotenv from 'dotenv'
dotenv.config()
import mongoose from 'mongoose'
import connectDB from '../src/config/db.js'
import Employee from '../src/models/employee.model.js'
import Attendance from '../src/models/attendance.model.js'

const connect = async () => {
  try {
    await connectDB()
  } catch (err) {
    console.error('DB connect failed', err)
    process.exit(1)
  }
}

const undo = async () => {
  try {
    const testEmployees = await Employee.find({ empId: { $regex: '^TEST_' } }).select('_id empId name')
    if (!testEmployees.length) {
      console.log('No TEST_ employees found. Nothing to delete.')
      return
    }

    const ids = testEmployees.map(e => e._id)
    console.log(`Found ${ids.length} TEST_ employees. Deleting attendance and employees...`)

    const delAttend = await Attendance.deleteMany({ employee: { $in: ids } })
    const delEmp = await Employee.deleteMany({ _id: { $in: ids } })

    console.log(`Attendance deleted: ${delAttend.deletedCount || 0}`)
    console.log(`Employees deleted: ${delEmp.deletedCount || 0}`)
  } catch (err) {
    console.error('Error while undoing seed:', err)
  } finally {
    await mongoose.connection.close()
    console.log('DB connection closed.')
  }
}

connect().then(() => undo())
