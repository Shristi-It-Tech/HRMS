const express = require('express');
const authMiddleware = require('../middleware/auth');
const { allowRoles } = require('../middleware/roles');
const AttendanceRecord = require('../models/AttendanceRecord');
const Permission = require('../models/Permission');

const router = express.Router();

const calculateMinutesDiff = (time1, time2) => {
  const [h1, m1] = time1.split(':').map(Number);
  const [h2, m2] = time2.split(':').map(Number);
  return Math.max(0, (h1 * 60 + m1) - (h2 * 60 + m2));
};

router.post('/clock', authMiddleware, async (req, res) => {
  const { type, photoUrl, location, coordinates, permission } = req.body;
  if (!type || (type !== 'clock_in' && type !== 'clock_out')) {
    return res.status(400).json({ message: 'Invalid clock type' });
  }

  const now = new Date();
  const date = now.toLocaleDateString('en-US');
  const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

  let isLate = false;
  let isEarlyLeave = false;
  let lateDuration = 0;

  let permissionDoc = null;
  if (permission && (permission.note || permission.durationMinutes || permission.description)) {
    permissionDoc = await Permission.create({
      userId: req.user._id,
      type: permission.type || (type === 'clock_in' ? 'late' : 'early_leave'),
      note: permission.note || permission.description || '',
      durationMinutes: permission.durationMinutes || 0,
      division: req.user.division,
      role: req.user.role
    });
  }

  const recordStatus = permissionDoc || isLate || isEarlyLeave ? 'pending' : 'valid';
  const record = await AttendanceRecord.create({
    userId: req.user._id,
    type,
    date,
    time,
    timestamp: now,
    location,
    coordinates,
    photoUrl,
    isLate,
    lateDuration,
    isEarlyLeave,
    permissionId: permissionDoc ? permissionDoc._id : null,
    status: recordStatus,
    reason: permission?.description || '',
    permissionNote: permission?.note || '',
    permissionFile: permission?.fileUrl || ''
  });

  return res.json({ success: true, record });
});

router.get('/me', authMiddleware, async (req, res) => {
  const records = await AttendanceRecord.find({ userId: req.user._id }).sort({ timestamp: -1 }).limit(30);
  res.json(records);
});

router.get('/', authMiddleware, async (req, res) => {
  const { userId, date, status } = req.query;
  const query = {};
  if (userId) query.userId = userId;
  if (date) query.date = date;
  if (status) query.status = status;
  const records = await AttendanceRecord.find(query).sort({ timestamp: -1 });
  res.json(records);
});

router.put('/:id/review', authMiddleware, allowRoles(['manager', 'owner']), async (req, res) => {
  const { status } = req.body;
  if (!status) {
    return res.status(400).json({ message: 'Status is required' });
  }
  const record = await AttendanceRecord.findById(req.params.id);
  if (!record) {
    return res.status(404).json({ message: 'Attendance record not found' });
  }
  record.status = status;
  await record.save();
  res.json(record);
});

module.exports = router;
