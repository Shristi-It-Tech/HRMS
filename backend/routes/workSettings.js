const express = require('express');
const authMiddleware = require('../middleware/auth');
const { allowRoles } = require('../middleware/roles');
const WorkSetting = require('../models/WorkSetting');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
  const settings = await WorkSetting.find({ enabled: true });
  res.json(settings);
});

router.post('/', authMiddleware, allowRoles(['owner', 'manager']), async (req, res) => {
  const setting = await WorkSetting.create(req.body);
  res.json(setting);
});

router.patch('/:id', authMiddleware, allowRoles(['owner', 'manager']), async (req, res) => {
  const setting = await WorkSetting.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(setting);
});

module.exports = router;
