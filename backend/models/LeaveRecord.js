const mongoose = require('mongoose');

const LeaveRecordSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['annual', 'sick', 'other'], required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  days: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
  note: { type: String },
  createdAt: { type: Date, default: () => new Date() }
});

module.exports = mongoose.model('LeaveRecord', LeaveRecordSchema);
