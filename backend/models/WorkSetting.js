const mongoose = require('mongoose');

const WorkSettingSchema = new mongoose.Schema({
  division: { type: String, required: true },
  shiftName: { type: String },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  gracePeriod: { type: Number, default: 10 },
  allowedRadiusMeters: { type: Number, default: 250 },
  latitude: { type: Number },
  longitude: { type: Number },
  earlyLeaveDeduction: { type: Number, default: 0 },
  lateTolerance: { type: Number, default: 0 },
  activeDays: [{ type: String }],
  timezone: { type: String, default: 'UTC' },
  enabled: { type: Boolean, default: true }
});

module.exports = mongoose.model('WorkSetting', WorkSettingSchema);
