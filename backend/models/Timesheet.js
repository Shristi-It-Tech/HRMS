const mongoose = require('mongoose');

const TimesheetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  projectId: { type: String, required: true },
  projectName: { type: String },
  date: { type: String, required: true }, // e.g. '2025-12-09'
  startTime: { type: String, required: true }, // e.g. '09:00'
  endTime: { type: String, required: true }, // e.g. '17:00'
  description: { type: String },
  status: { type: String, enum: ['submitted', 'approved', 'rejected'], default: 'submitted' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

TimesheetSchema.index({ userId: 1, date: 1 });

// Virtual to calculate hours for this entry
TimesheetSchema.virtual('hours').get(function () {
  if (!this.startTime || !this.endTime) return 0;
  const [startH, startM] = this.startTime.split(':').map(Number);
  const [endH, endM] = this.endTime.split(':').map(Number);
  let start = startH * 60 + startM;
  let end = endH * 60 + endM;
  if (end > start) {
    return ((end - start) / 60).toFixed(2);
  }
  return 0;
});

module.exports = mongoose.model('Timesheet', TimesheetSchema);
