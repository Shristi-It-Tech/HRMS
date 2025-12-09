const express = require('express');
const authMiddleware = require('../middleware/auth');
const { allowRoles } = require('../middleware/roles');
const Timesheet = require('../models/Timesheet');

const router = express.Router();

// Get my timesheets (MUST be before /:userId route)
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const timesheets = await Timesheet.find({ userId: req.user._id })
      .sort({ date: -1 })
      .lean();
    res.json(timesheets);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch timesheets', error: error.message });
  }
});

// Get all timesheets (manager/owner)
router.get('/', authMiddleware, allowRoles(['manager', 'owner']), async (req, res) => {
  try {
    const timesheets = await Timesheet.find({})
      .populate('userId', 'name email division')
      .sort({ date: -1 })
      .lean();
    res.json(timesheets);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch timesheets', error: error.message });
  }
});

// Get timesheets for a specific employee (manager/owner)
router.get('/employee/:userId', authMiddleware, allowRoles(['manager', 'owner']), async (req, res) => {
  try {
    const timesheets = await Timesheet.find({ userId: req.params.userId })
      .sort({ date: -1 })
      .lean();
    res.json(timesheets);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch employee timesheets', error: error.message });
  }
});

// Submit or update a timesheet entry
router.post('/', authMiddleware, async (req, res) => {
  const { projectId, projectName, date, startTime, endTime, description } = req.body;
  if (!projectId || !date || !startTime || !endTime) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  // Validate that startTime is earlier than endTime
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  if (endMinutes <= startMinutes) {
    return res.status(400).json({ message: 'End time must be after start time' });
  }
  try {
    const timesheet = new Timesheet({
      userId: req.user._id,
      projectId,
      projectName: projectName || '',
      date,
      startTime,
      endTime,
      description: description || ''
    });
    await timesheet.save();
    res.json({ success: true, timesheet });
  } catch (error) {
    res.status(500).json({ message: 'Failed to save timesheet', error: error.message });
  }
});

// Update a timesheet entry (owner or managers can edit all; users can edit their own)
router.put('/:id', authMiddleware, async (req, res) => {
  const { projectId, projectName, date, startTime, endTime, description } = req.body;
  if (!projectId || !date || !startTime || !endTime) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  // Validate that startTime is earlier than endTime
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  if (endMinutes <= startMinutes) {
    return res.status(400).json({ message: 'End time must be after start time' });
  }
  try {
    const timesheet = await Timesheet.findById(req.params.id);
    if (!timesheet) {
      return res.status(404).json({ message: 'Timesheet not found' });
    }
    // Allow owner/manager to edit any, others only their own
    const role = req.user.role;
    const isAdminRole = role === 'manager' || role === 'owner';
    if (!isAdminRole && String(timesheet.userId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Not authorized to edit this timesheet' });
    }
    timesheet.projectId = projectId;
    timesheet.projectName = projectName || '';
    timesheet.date = date;
    timesheet.startTime = startTime;
    timesheet.endTime = endTime;
    timesheet.description = description || '';
    timesheet.updatedAt = new Date();
    await timesheet.save();
    res.json({ success: true, timesheet });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update timesheet', error: error.message });
  }
});

module.exports = router;
