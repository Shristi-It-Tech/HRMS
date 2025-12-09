const express = require('express');
const authMiddleware = require('../middleware/auth');
const { allowRoles } = require('../middleware/roles');
const ProfileChangeRequest = require('../models/ProfileChangeRequest');

const router = express.Router();

router.post('/', authMiddleware, async (req, res) => {
  const { changes } = req.body;
  if (!changes || typeof changes !== 'object') {
    return res.status(400).json({ message: 'Changes payload required' });
  }
  const profileRequest = await ProfileChangeRequest.create({
    userId: req.user._id,
    requestedBy: req.user._id,
    changes,
    division: req.user.division
  });
  res.json(profileRequest);
});

router.get('/', authMiddleware, async (req, res) => {
  const query = {};
  if (req.user.role === 'employee') {
    query.userId = req.user._id;
  }
  const requests = await ProfileChangeRequest.find(query).sort({ requestedAt: -1 }).limit(30);
  res.json(requests);
});

router.patch('/:id/approve', authMiddleware, allowRoles(['manager', 'owner']), async (req, res) => {
  const request = await ProfileChangeRequest.findById(req.params.id);
  if (!request) {
    return res.status(404).json({ message: 'Request not found' });
  }
  request.status = 'approved';
  request.approvedBy = req.user._id;
  request.approvedAt = new Date();
  request.comments = req.body.comments || '';
  await request.save();
  res.json(request);
});

router.patch('/:id/reject', authMiddleware, allowRoles(['manager', 'owner']), async (req, res) => {
  const request = await ProfileChangeRequest.findById(req.params.id);
  if (!request) {
    return res.status(404).json({ message: 'Request not found' });
  }
  request.status = 'rejected';
  request.approvedBy = req.user._id;
  request.approvedAt = new Date();
  request.comments = req.body.comments || '';
  await request.save();
  res.json(request);
});

module.exports = router;
