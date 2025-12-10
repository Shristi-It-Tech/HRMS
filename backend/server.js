require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const path = require('path');

const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const attendanceRoutes = require('./routes/attendance');
const permissionRoutes = require('./routes/permissions');
const profileRoutes = require('./routes/profileRequests');
const timesheetRoutes = require('./routes/timesheets');
const projectRoutes = require('./routes/projects');
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/permissions', permissionRoutes);
app.use('/api/profile-requests', profileRoutes);
app.use('/api/timesheets', timesheetRoutes);
app.use('/api/projects', projectRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const start = async () => {
  try {
    await mongoose.connect(MONGO_URI, { dbName: 'hrms' });
    console.log('🍃 Connected to MongoDB at', MONGO_URI);
    app.listen(process.env.PORT || 4000, () => {
      console.log('🚀 Backend listening on port', process.env.PORT || 4000);
    });
  } catch (err) {
    console.error('Mongo connection failed', err);
    process.exit(1);
  }
};

start();
