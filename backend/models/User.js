const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  nik: { type: String, unique: true, sparse: true },
  email: { type: String, unique: true, required: true },
  phone: { type: String, unique: true, sparse: true },
  name: { type: String, required: true },
  role: { type: String, enum: ['employee', 'supervisor', 'manager', 'owner', 'hr'], required: true },
  division: { type: String },
  department: { type: String },
  passwordHash: { type: String, required: true },
  salt: { type: String },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  profileImage: { type: String },
  cvUrl: { type: String },
  diplomaUrl: { type: String },
  address: { type: String },
  gender: { type: String },
  dob: { type: Date },
  leaveBalance: { type: Number, default: 12 },
  performanceScore: { type: Number, default: 75 },
  joinDate: { type: Date },
  tasks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
  permissionHistory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Permission' }],
  createdAt: { type: Date, default: () => new Date() },
  updatedAt: { type: Date, default: () => new Date() }
});

UserSchema.index({ role: 1, division: 1 });
UserSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('User', UserSchema);
