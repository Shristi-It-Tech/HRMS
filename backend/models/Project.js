const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  code: { type: String, required: true, unique: true, trim: true },
  client: { type: String, trim: true },
  status: { type: String, enum: ['active', 'archived'], default: 'active' },
  startDate: { type: Date },
  endDate: { type: Date },
  budget: { type: Number, default: 0 },
  description: { type: String },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

ProjectSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Project', ProjectSchema);
