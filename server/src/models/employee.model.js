import mongoose from "mongoose";

const employeeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    fatherName: {
        type: String
    },
    mobile: {
        type: String
    },
    salary: {
        type: Number
    },
    empId: {
        type: String
    },
    department: {
        type: String
    },
    subDepartment: {
        type: String
    },
    group: {
        type: String
    },
    status: {
        type: String,
        enum: ["active", "inactive"],
        default: "active"
    },
    avatar: {
        type: String
    }
}, { timestamps: true });

const Employee = mongoose.model("Employee", employeeSchema);

export default Employee;
