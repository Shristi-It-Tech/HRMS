const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String },
  assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  division: { type: String },
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  status: { type: String, enum: ['pending', 'in_progress', 'completed'], default: 'pending' },
  dueDate: { type: Date },
  targetDate: { type: Date },
  score: { type: Number },
  metrics: { type: mongoose.Schema.Types.Mixed },
  completedAt: { type: Date },
  reviewNotes: { type: String }
});

module.exports = mongoose.model('Task', TaskSchema);
