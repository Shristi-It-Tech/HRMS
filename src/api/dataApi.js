import { showSwal } from '../utils/swal';

// Coordinates for PT Wilmar Medan Office
const COMPANY_LOCATION = {
  latitude: 3.6206229,
  longitude: 98.7294571,
  name: 'PT Wilmar Medan Office'
};

// Calculate the difference between two HH:mm strings in minutes
const calculateTimeDifference = (time1, time2) => {
  const [hour1, minute1] = time1.split(':').map(Number);
  const [hour2, minute2] = time2.split(':').map(Number);
  const totalMinutes1 = hour1 * 60 + minute1;
  const totalMinutes2 = hour2 * 60 + minute2;
  return Math.abs(totalMinutes1 - totalMinutes2);
};

// Handle an employee clock-in/out action
export const handleAttendanceClock = async (user, type, photoData, workSettings, permissionData = null) => {
  try {
    // Capture current date & time
    const now = new Date();
    const date = now.toLocaleDateString('en-US');
    const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    // Determine lateness or early departure
    const startTime = workSettings?.startTime || '08:00';
    const endTime = workSettings?.endTime || '17:00';
    
    let isLate = false;
    let isEarlyLeave = false;
    let reason = '';
    let permissionNote = '';
    let permissionFile = '';
    let lateDuration = 0;

    // Late detection for clock in (after start time)
    if (type === 'In') {
      if (time > startTime) {
        isLate = true;
        lateDuration = calculateTimeDifference(time, startTime);
      }
    }

    // Early leave detection for clock out (before end time)
    if (type === 'Out') {
      if (time < endTime) {
        isEarlyLeave = true;
      }
    }

    // Attach permission data if provided
    if (permissionData) {
      permissionNote = permissionData.note || '';
      permissionFile = permissionData.file || '';
      reason = permissionData.note || '';
    }

    // Compose attendance record
    const newRecord = {
      id: Date.now(),
      userId: user.id,
      name: user.name,
      date,
      time,
      type: type === 'In' ? 'Clock In' : 'Clock Out',
      isLate,
      isEarlyLeave,
      lateDuration,
      reason,
      permissionNote,
      permissionFile,
      location: 'PT Wilmar Medan Office',
      coordinates: `${COMPANY_LOCATION.latitude}, ${COMPANY_LOCATION.longitude}`,
      division: user.division,
      hasPermission: !!permissionData
    };

    // Store captured selfie
    const newPhotoRecord = {
      id: Date.now(),
      userId: user.id,
      date,
      type: type === 'In' ? 'clock_in' : 'clock_out',
      image: photoData,
      timestamp: now.toISOString()
    };

    // Success copy
    let successMessage = `Successfully completed ${type === 'In' ? 'Clock In' : 'Clock Out'}!`;
    
    if (isLate) {
      successMessage += ` (Late by ${lateDuration} minutes)`;
    }
    if (isEarlyLeave) {
      successMessage += ' (Left Early)';
    }
    if (permissionData) {
      successMessage += ' - With Permission';
    }

    showSwal('Success', successMessage, 'success');

    return { 
      success: true, 
      newRecord, 
      newPhotoRecord,
      isLate,
      isEarlyLeave,
      lateDuration
    };

  } catch (error) {
    console.error('Error handleAttendanceClock:', error);
    showSwal('Error', 'Failed to submit attendance: ' + error.message, 'error');
    return { success: false, error: error.message };
  }
};

// Submit a permission (late/early leave) request
export const submitPermissionRequest = async (user, type, permissionData, workSettings) => {
  try {
    const now = new Date();
    const date = now.toLocaleDateString('en-US');
    const time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    // Build permission request record
    const permissionRecord = {
      id: Date.now(),
      userId: user.id,
      name: user.name,
      date,
      time,
      type: type === 'In' ? 'Late Arrival Permission' : 'Early Leave Permission',
      permissionType: type === 'In' ? 'late' : 'early_out',
      note: permissionData.note,
      file: permissionData.file,
      status: 'approved', // Dummy data is auto-approved
      approvedBy: 'System Auto',
      approvedAt: now.toISOString(),
      division: user.division
    };

    // Save to the user's permission history
    const userPermissionHistory = user.permissionHistory || [];
    userPermissionHistory.push(permissionRecord);

    // Additional copy when late duration is specified
    let additionalInfo = '';
    if (type === 'In' && permissionData.lateDuration) {
      additionalInfo = ` (${permissionData.lateDuration} minutes)`;
    }

    showSwal(
      'Permission Approved', 
      `Your ${type === 'In' ? 'late arrival' : 'early leave'} request has been approved${additionalInfo}. ${type === 'Out' ? 'Clock out has been recorded automatically.' : 'Please proceed with attendance.'}`, 
      'success'
    );

    return {
      success: true,
      permissionRecord,
      message: 'Permission submitted and approved successfully'
    };

  } catch (error) {
    console.error('Error submitPermissionRequest:', error);
    showSwal('Error', 'Failed to submit permission request: ' + error.message, 'error');
    return { success: false, error: error.message };
  }
};

// Utility to calculate performance metrics
export const getPerformanceData = (user) => {
  return {
    score: user.performanceScore || 85,
    completedTasks: user.tasks ? user.tasks.filter(task => task.status === 'Completed').length : 0,
    pendingTasks: user.tasks ? user.tasks.filter(task => task.status === 'Pending' || task.status === 'In Progress').length : 0,
    totalTasks: user.tasks ? user.tasks.length : 0,
    targetAchievement: Math.min(100, Math.floor((user.performanceScore || 85) / 85 * 100))
  };
};

// Retrieve user leave history
export const getLeaveHistory = (user) => {
  return user.leaveHistory || [];
};

// Submit a profile update request
export const updateEmployeeProfile = async (employeeId, changes) => {
  try {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      success: true,
      message: 'Profile change request was sent successfully',
      requestId: Date.now()
    };
  } catch (error) {
    return {
      success: false,
      error: 'Failed to submit profile change request'
    };
  }
};
