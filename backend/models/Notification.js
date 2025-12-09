const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, required: true },
  status: { type: String, enum: ['unread', 'read'], default: 'unread' },
  message: { type: String, required: true },
  relatedId: { type: mongoose.Schema.Types.ObjectId },
  createdAt: { type: Date, default: () => new Date() },
  read: { type: Boolean, default: false }
});

module.exports = mongoose.model('Notification', NotificationSchema);
