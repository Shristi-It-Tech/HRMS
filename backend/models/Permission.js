const mongoose = require('mongoose');

const PermissionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  attendanceId: { type: mongoose.Schema.Types.ObjectId, ref: 'AttendanceRecord' },
  type: { type: String, enum: ['late', 'early_leave', 'other'], required: true },
  note: { type: String },
  fileUrl: { type: String },
  durationMinutes: { type: Number },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  requestedAt: { type: Date, default: () => new Date() },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  decisionNotes: { type: String },
  approvedAt: { type: Date },
  workSettingId: { type: mongoose.Schema.Types.ObjectId, ref: 'WorkSetting' },
  division: { type: String },
  role: { type: String, enum: ['employee', 'supervisor', 'manager', 'owner'] }
});

PermissionSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('Permission', PermissionSchema);
