const mongoose = require('mongoose');

const LeaveQuotaSchema = new mongoose.Schema({
  annualLeaves: { type: Number, required: true, default: 12 },
  sickLeavesPerMonth: { type: Number, required: true, default: 2 },
  effectiveYear: { type: Number, default: new Date().getFullYear() },
  createdAt: { type: Date, default: () => new Date() },
  updatedAt: { type: Date, default: () => new Date() }
});

LeaveQuotaSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('LeaveQuota', LeaveQuotaSchema);
