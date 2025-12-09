const express = require('express');
const router = express.Router();
const LeaveQuota = require('../models/LeaveQuota');
const LeaveRecord = require('../models/LeaveRecord');
const User = require('../models/User');

// Get current master leave quota
router.get('/quota', async (req, res) => {
  try {
    let quota = await LeaveQuota.findOne();
    if (!quota) {
      quota = await LeaveQuota.create({});
    }
    res.json(quota);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch leave quota' });
  }
});

// Apply for leave (creates a leave record and returns updated remaining leaves)
router.post('/apply', async (req, res) => {
  try {
    const { userId, type, startDate, endDate, days, note } = req.body;
    if (!userId || !type || !startDate || !endDate || !days) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create the leave record (default approved for now)
    const record = await LeaveRecord.create({ userId, type, startDate, endDate, days, note, status: 'approved' });

    // Ensure we have master quota
    let quota = await LeaveQuota.findOne();
    if (!quota) quota = await LeaveQuota.create({});

    // Calculate taken annual leaves for the current year
    const yearStart = new Date(new Date().getFullYear(), 0, 1);
    const annualTakenAgg = await LeaveRecord.aggregate([
      { $match: { userId: record.userId, type: 'annual', status: 'approved', startDate: { $gte: yearStart } } },
      { $group: { _id: null, total: { $sum: '$days' } } }
    ]);
    const annualTaken = (annualTakenAgg[0] && annualTakenAgg[0].total) || 0;
    const remainingAnnual = Math.max(0, quota.annualLeaves - annualTaken);

    // Calculate sick leaves taken for current month
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const sickTakenAgg = await LeaveRecord.aggregate([
      { $match: { userId: record.userId, type: 'sick', status: 'approved', startDate: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: '$days' } } }
    ]);
    const sickTaken = (sickTakenAgg[0] && sickTakenAgg[0].total) || 0;
    const remainingSickThisMonth = Math.max(0, quota.sickLeavesPerMonth - sickTaken);

    // Update user's leaveBalance to reflect remaining annual leaves
    await User.findByIdAndUpdate(userId, { leaveBalance: remainingAnnual });

    res.json({ record, remainingAnnual, remainingSickThisMonth });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to apply leave' });
  }
});

module.exports = router;
