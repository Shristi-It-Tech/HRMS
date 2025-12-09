require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');
const WorkSetting = require('./models/WorkSetting');

const USERS = [
  {
    name: 'Asep Employee',
    email: 'employee@hrms.local',
    nik: 'EMP-001',
    role: 'employee',
    division: 'Operations',
    department: 'Software',
    password: 'password',
    leaveBalance: 12,
    status: 'active'
  },
  {
    name: 'Rani Supervisor',
    email: 'supervisor@hrms.local',
    nik: 'SUP-001',
    role: 'supervisor',
    division: 'Operations',
    department: 'Support',
    password: 'password',
    leaveBalance: 15,
    status: 'active'
  },
  {
    name: 'Doni Manager',
    email: 'manager@hrms.local',
    nik: 'MGR-001',
    role: 'manager',
    division: 'Operations',
    department: 'Resource',
    password: 'password',
    leaveBalance: 18,
    status: 'active'
  },
  {
    name: 'Irawan Owner',
    email: 'owner@hrms.local',
    nik: 'OWN-001',
    role: 'owner',
    division: 'Operations',
    department: 'Executive',
    password: 'password',
    leaveBalance: 21,
    status: 'active'
  },
  {
    name: 'Tika HR',
    email: 'hr@hrms.local',
    nik: 'HR-001',
    role: 'hr',
    division: 'People',
    department: 'Human Resources',
    password: 'password',
    leaveBalance: 20,
    status: 'active'
  }
];

const WORK_SETTINGS = [
  {
    division: 'Operations',
    shiftName: 'Core Shift',
    startTime: '08:00',
    endTime: '17:00',
    gracePeriod: 10,
    allowedRadiusMeters: 400,
    latitude: 3.6206229,
    longitude: 98.7294571,
    enabled: true
  },
  {
    division: 'People',
    shiftName: 'Office Shift',
    startTime: '09:00',
    endTime: '18:00',
    gracePeriod: 5,
    allowedRadiusMeters: 300,
    latitude: 3.6206229,
    longitude: 98.7294571,
    enabled: true
  }
];

const hashPassword = (plaintext) => bcrypt.hashSync(plaintext, 10);

const seedUsers = async () => {
  for (const userData of USERS) {
    const existing = await User.findOne({ email: userData.email });
    if (existing) {
      Object.assign(existing, { ...userData, passwordHash: hashPassword(userData.password) });
      await existing.save();
      console.log(`Updated ${userData.role} (${userData.email})`);
      continue;
    }
    const user = new User({
      ...userData,
      passwordHash: hashPassword(userData.password),
      joinDate: new Date(),
    });
    await user.save();
    console.log(`Created ${userData.role} (${userData.email})`);
  }
};

const seedWorkSettings = async () => {
  for (const setting of WORK_SETTINGS) {
    const existing = await WorkSetting.findOne({ division: setting.division });
    if (existing) {
      Object.assign(existing, setting);
      await existing.save();
      console.log(`Updated work setting for ${setting.division}`);
      continue;
    }
    await WorkSetting.create(setting);
    console.log(`Created work setting for ${setting.division}`);
  }
};

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, { dbName: 'hrms' });
    await seedUsers();
    await seedWorkSettings();
  } catch (error) {
    console.error('Seeding failed:', error);
  } finally {
    await mongoose.connection.close();
  }
};

run();
