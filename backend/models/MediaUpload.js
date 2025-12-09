const mongoose = require('mongoose');

const MediaUploadSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  attendanceId: { type: mongoose.Schema.Types.ObjectId, ref: 'AttendanceRecord' },
  url: { type: String, required: true },
  type: { type: String },
  createdAt: { type: Date, default: () => new Date() },
  expiresAt: { type: Date }
});

MediaUploadSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('MediaUpload', MediaUploadSchema);
