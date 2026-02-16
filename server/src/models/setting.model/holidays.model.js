import mongoose from "mongoose";

const holidaySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    date: {
        type: Date,
        required: true,
    },
    description: {
        type: String,
    },
}, { timestamps: true });

const Holiday = mongoose.model("Holiday", holidaySchema);

// import dailyCache from '../../services/dailySalaryCache.service.js'

// holidaySchema.post('save', function (doc) {
//     try { dailyCache.invalidateByDate(doc.date).catch(() => {}) } catch (e) {}
// })
// holidaySchema.post('remove', function (doc) {
//     try { dailyCache.invalidateByDate(doc.date).catch(() => {}) } catch (e) {}
// })
// holidaySchema.post('findOneAndUpdate', function (doc) {
//     if (doc && doc.date) dailyCache.invalidateByDate(doc.date).catch(() => {})
// })
// holidaySchema.post('findOneAndDelete', function (doc) {
//     if (doc && doc.date) dailyCache.invalidateByDate(doc.date).catch(() => {})
// })

export default Holiday;