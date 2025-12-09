const express = require('express');
const bcrypt = require('bcryptjs');
const authMiddleware = require('../middleware/auth');
const { allowRoles } = require('../middleware/roles');
const User = require('../models/User');

const router = express.Router();

const allowedRolesByCreator = {
  owner: ['manager', 'supervisor', 'employee'],
  manager: ['supervisor', 'employee']
};

router.get('/me', authMiddleware, async (req, res) => {
  const user = await User.findById(req.user._id).select('-passwordHash -salt');
  res.json(user);
});

router.post(
  '/',
  authMiddleware,
  allowRoles(['owner', 'manager']),
  async (req, res) => {
    const creatorRole = req.user.role;
    const { name, email, role, division, department, password } = req.body;

    if (!name || !email || !role || !password) {
      return res.status(400).json({ message: 'Name, email, role, and password are required.' });
    }

    const allowedRoles = allowedRolesByCreator[creatorRole] || [];
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ message: 'You are not allowed to create that role.' });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'Email already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = new User({
      name,
      email,
      role,
      division: division || req.user.division,
      department,
      passwordHash,
      joinDate: new Date(),
      status: 'active',
      leaveBalance: 12,
      performanceScore: 0
    });
    await user.save();

    res.status(201).json({
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      division: user.division
    });
  }
);

router.patch('/me', authMiddleware, async (req, res) => {
  const updates = { ...req.body };
  delete updates.passwordHash;
  delete updates.role;
  delete updates.status;

  const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true }).select('-passwordHash -salt');
  res.json(user);
});

module.exports = router;
