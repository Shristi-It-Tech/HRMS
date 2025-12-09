const mongoose = require('mongoose');

const AuthTokenSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  refreshToken: { type: String, required: true },
  userAgent: { type: String },
  ip: { type: String },
  expiresAt: { type: Date, required: true },
  revoked: { type: Boolean, default: false }
});

AuthTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('AuthToken', AuthTokenSchema);
