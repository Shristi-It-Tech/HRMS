const mongoose = require('mongoose');

const ProfileChangeRequestSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  changes: { type: mongoose.Schema.Types.Mixed, required: true },
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  division: { type: String },
  requestedAt: { type: Date, default: () => new Date() },
  approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date },
  comments: { type: String },
  approverRole: { type: String }
});

ProfileChangeRequestSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('ProfileChangeRequest', ProfileChangeRequestSchema);
