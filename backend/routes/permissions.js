const express = require('express');
const authMiddleware = require('../middleware/auth');
const { allowRoles } = require('../middleware/roles');
const Permission = require('../models/Permission');

const router = express.Router();

router.post('/', authMiddleware, async (req, res) => {
  const { type, note, fileUrl, durationMinutes, attendanceId } = req.body;
  const permission = await Permission.create({
    userId: req.user._id,
    type,
    note,
    fileUrl,
    durationMinutes,
    attendanceId,
    division: req.user.division,
    role: req.user.role
  });
  res.json(permission);
});

router.get('/', authMiddleware, async (req, res) => {
  const query = {};
  if (req.user.role !== 'owner' && req.user.role !== 'manager') {
    query.userId = req.user._id;
  }
  const permissions = await Permission.find(query).sort({ requestedAt: -1 }).limit(50);
  res.json(permissions);
});

router.patch('/:id/approve', authMiddleware, allowRoles(['manager', 'owner']), async (req, res) => {
  const permission = await Permission.findById(req.params.id);
  if (!permission) {
    return res.status(404).json({ message: 'Permission not found' });
  }
  permission.status = 'approved';
  permission.approvedBy = req.user._id;
  permission.approvedAt = new Date();
  permission.decisionNotes = req.body.notes || '';
  await permission.save();
  res.json(permission);
});

router.patch('/:id/reject', authMiddleware, allowRoles(['manager', 'owner']), async (req, res) => {
  const permission = await Permission.findById(req.params.id);
  if (!permission) {
    return res.status(404).json({ message: 'Permission not found' });
  }
  permission.status = 'rejected';
  permission.rejectedBy = req.user._id;
  permission.approvedAt = new Date();
  permission.decisionNotes = req.body.notes || '';
  await permission.save();
  res.json(permission);
});

module.exports = router;
