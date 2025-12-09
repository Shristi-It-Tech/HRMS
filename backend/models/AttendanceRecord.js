const mongoose = require('mongoose');

const AttendanceRecordSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['clock_in', 'clock_out'], required: true },
  date: { type: String },
  time: { type: String },
  timestamp: { type: Date, default: () => new Date() },
  location: { type: String },
  coordinates: { type: String },
  deviceInfo: { type: String },
  isLate: { type: Boolean, default: false },
  lateDuration: { type: Number, default: 0 },
  isEarlyLeave: { type: Boolean, default: false },
  reason: { type: String },
  permissionNote: { type: String },
  permissionFile: { type: String },
  photoUrl: { type: String },
  permissionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Permission', default: null },
  workSettingId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkSetting' },
  status: { type: String, enum: ['valid', 'pending', 'rejected'], default: 'valid' }
});

AttendanceRecordSchema.index({ userId: 1, date: 1 });

module.exports = mongoose.model('AttendanceRecord', AttendanceRecordSchema);
