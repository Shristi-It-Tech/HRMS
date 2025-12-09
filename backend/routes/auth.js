const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuthToken = require('../models/AuthToken');

const router = express.Router();

const signJwt = (user) => {
  return jwt.sign(
    { userId: user._id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRY || '15m' }
  );
};

const generateRefreshToken = () => require('crypto').randomBytes(48).toString('hex');

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password required' });
  }

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const accessToken = signJwt(user);
  const refreshToken = generateRefreshToken();
  await AuthToken.create({
    userId: user._id,
    refreshToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  });

  res.json({
    accessToken,
    refreshToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      division: user.division
    },
    expiresIn: process.env.JWT_EXPIRY || '15m'
  });
});

router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ message: 'Refresh token required' });
  }

  const stored = await AuthToken.findOne({ refreshToken, revoked: false });
  if (!stored || stored.expiresAt < new Date()) {
    return res.status(401).json({ message: 'Invalid refresh token' });
  }

  const user = await User.findById(stored.userId);
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  // Rotate refresh token
  const newRefreshToken = generateRefreshToken();
  stored.refreshToken = newRefreshToken;
  stored.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  await stored.save();

  const newAccessToken = signJwt(user);
  res.json({
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      division: user.division
    },
    expiresIn: process.env.JWT_EXPIRY || '15m'
  });
});

router.post('/logout', async (req, res) => {
  const { refreshToken } = req.body;
  if (refreshToken) {
    await AuthToken.findOneAndUpdate({ refreshToken }, { revoked: true });
  }
  res.json({ message: 'Logged out' });
});

module.exports = router;
