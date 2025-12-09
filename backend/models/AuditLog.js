const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  action: { type: String, required: true },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  targetType: { type: String },
  targetId: { type: mongoose.Schema.Types.ObjectId },
  metadata: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: () => new Date() }
});

module.exports = mongoose.model('AuditLog', AuditLogSchema);
