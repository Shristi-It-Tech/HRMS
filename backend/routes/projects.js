const express = require('express');
const authMiddleware = require('../middleware/auth');
const { allowRoles } = require('../middleware/roles');
const Project = require('../models/Project');

const router = express.Router();

// Get all projects (all authenticated users)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const projects = await Project.find({}).sort({ status: 1, name: 1 });
    res.json(projects);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch projects', error: error.message });
  }
});

// Create project (manager, owner)
router.post('/', authMiddleware, allowRoles(['manager', 'owner']), async (req, res) => {
  try {
    const { name, code, client, status, startDate, endDate, budget, description } = req.body;
    if (!name || !code) {
      return res.status(400).json({ message: 'Name and code are required' });
    }
    const existing = await Project.findOne({ code });
    if (existing) {
      return res.status(400).json({ message: 'Project code must be unique' });
    }
    const project = await Project.create({
      name,
      code,
      client: client || '',
      status: status || 'active',
      startDate: startDate ? new Date(startDate) : null,
      endDate: endDate ? new Date(endDate) : null,
      budget: budget || 0,
      description: description || '',
      createdBy: req.user._id
    });
    res.json({ success: true, project });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create project', error: error.message });
  }
});

// Update project (manager, owner)
router.put('/:id', authMiddleware, allowRoles(['manager', 'owner']), async (req, res) => {
  try {
    const updates = { ...req.body };
    const allowed = ['name', 'code', 'client', 'status', 'startDate', 'endDate', 'budget', 'description'];
    Object.keys(updates).forEach((key) => {
      if (!allowed.includes(key)) delete updates[key];
    });
    if (updates.startDate) updates.startDate = new Date(updates.startDate);
    if (updates.endDate) updates.endDate = new Date(updates.endDate);
    updates.updatedAt = new Date();

    const project = await Project.findByIdAndUpdate(req.params.id, updates, { new: true });
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.json({ success: true, project });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update project', error: error.message });
  }
});

// Delete project (manager, owner)
router.delete('/:id', authMiddleware, allowRoles(['manager', 'owner']), async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete project', error: error.message });
  }
});

module.exports = router;
