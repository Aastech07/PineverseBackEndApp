const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: String, required: true },
    sender: { type: String, required: true },
    type: { type: String, required: true, enum: ['follow_request', 'follow_accepted'] },
    message: { type: String, required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
