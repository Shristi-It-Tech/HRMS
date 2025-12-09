const API_ROUTES = {
  history: '/api/attendance/me',
  all: '/api/attendance',
  clock: '/api/attendance/clock',
  review: (id) => `/api/attendance/${id}/review`,
};

const DEFAULT_LOCATION = {
  latitude: 3.6206229,
  longitude: 98.7294571,
  name: 'PT Wilmar Bisnis Medan',
};

const DEFAULT_WORK_HOURS = {
  startTime: '09:00',
  endTime: '17:00',
};

const hasStorage = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

const readJSON = (key, fallback) => {
  if (!hasStorage) return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const writeJSON = (key, value) => {
  if (!hasStorage) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* no-op */
  }
};

const getLocalSnapshot = () => ({
  authUser: readJSON('authUser', null),
  employees: readJSON('employees', []),
});

const persistLocalSnapshot = ({ authUser, employees }) => {
  if (authUser) writeJSON('authUser', authUser);
  if (employees) writeJSON('employees', employees);
};

const parseBool = (value) => {
  if (typeof value === 'boolean') return value;
  if (value === null || value === undefined) return false;
  if (typeof value === 'number') return value !== 0;
  const normalized = String(value).toLowerCase();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
};

const parseNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const toDateString = (value) => {
  if (!value) return null;
  try {
    const date = new Date(value);
    if (!isNaN(date)) return date.toISOString().split('T')[0];
  } catch {
    /* ignore */
  }
  return value;
};

const toTimeString = (value) => {
  if (!value) return null;
  if (/^\d{2}:\d{2}/.test(value)) return value.slice(0, 5);
  try {
    const date = new Date(value);
    if (!isNaN(date)) return date.toTimeString().slice(0, 5);
  } catch {
    /* ignore */
  }
  return value;
};

const buildCoordinates = (lat, lon) => {
  if ((lat || lat === 0) && (lon || lon === 0)) {
    return `${lat}, ${lon}`;
  }
  return `${DEFAULT_LOCATION.latitude}, ${DEFAULT_LOCATION.longitude}`;
};

const normalizeAttendanceRecord = (record = {}, fallbackUser = {}) => {
  const timestamp = record.timestamp || record.created_at || record.updated_at;
  const date =
    record.date ||
    record.attendance_date ||
    toDateString(timestamp) ||
    new Date().toISOString().split('T')[0];
  const time =
    record.time ||
    record.attendance_time ||
    toTimeString(timestamp) ||
    new Date().toTimeString().slice(0, 5);

  const typeRaw = record.type || record.attendance_type || '';
  const type =
    String(typeRaw).toLowerCase().includes('out') || typeRaw === 'Clock Out'
      ? 'Clock Out'
      : 'Clock In';

  const isLate =
    parseBool(record.isLate) ||
    parseBool(record.is_late) ||
    String(record.reason_type || '').toLowerCase() === 'late';
  const isEarlyLeave =
    parseBool(record.isEarlyLeave) ||
    parseBool(record.is_early_leave) ||
    parseBool(record.irregular_clockout) ||
    String(record.reason_type || '').toLowerCase().includes('early');

  const permissionNote =
    record.permissionNote ||
    record.permission_note ||
    record.permission_description ||
    record.note ||
    '';
  const permissionFile = record.permissionFile || record.permission_file || '';

  const normalized = {
    id: record.id || record.attendance_id || record.record_id || Date.now(),
    user_id: record.user_id || record.employee_id || fallbackUser.id || null,
    name: record.name || record.employee_name || fallbackUser.name || '',
    date,
    time,
    type,
    location: record.location || record.address || record.place || DEFAULT_LOCATION.name,
    coordinates: record.coordinates || buildCoordinates(record.latitude, record.longitude),
    latitude: record.latitude || null,
    longitude: record.longitude || null,
    isLate,
    isEarlyLeave,
    lateDuration: parseNumber(record.lateDuration || record.late_duration),
    reason: record.reason || record.reason_description || '',
    description: record.description || record.notes || '',
    permissionNote,
    permissionFile,
    hasPermission: Boolean(permissionNote || permissionFile || record.hasPermission || record.has_permission),
    permissionType:
      record.permissionType ||
      record.permission_type ||
      (isLate ? 'late' : isEarlyLeave ? 'early_out' : ''),
    needsApproval:
      parseBool(record.needsApproval) ||
      parseBool(record.needs_approval) ||
      parseBool(record.requires_review) ||
      false,
    status: record.status || (parseBool(record.needsApproval) ? 'pending' : 'completed'),
    photo: record.photo || record.photo_url || record.photo_path || null,
  };

  return normalized;
};

const normalizeListResponse = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.records)) return payload.records;
  if (Array.isArray(payload?.attendances)) return payload.attendances;
  return [];
};

const fetchAttendanceHistoryLocal = () => {
  const { authUser, employees } = getLocalSnapshot();
  if (!authUser) return [];
  const employee = employees.find((emp) => emp.id === authUser.id);
  const history =
    (employee && employee.currentMonthAttendance) || authUser.currentMonthAttendance || [];
  return Array.isArray(history)
    ? history.map((record) => normalizeAttendanceRecord(record, authUser))
    : [];
};

const fetchAllAttendanceHistoryLocal = () => {
  const { employees } = getLocalSnapshot();
  if (!Array.isArray(employees)) return [];
  return employees.flatMap((emp) => {
    const history = Array.isArray(emp.currentMonthAttendance) ? emp.currentMonthAttendance : [];
    return history.map((record) => normalizeAttendanceRecord(record, emp));
  });
};

const calculateMinutesDiff = (time1, time2) => {
  const [h1, m1] = time1.split(':').map(Number);
  const [h2, m2] = time2.split(':').map(Number);
  return Math.max(0, (h1 * 60 + m1) - (h2 * 60 + m2));
};

const updateLocalAttendanceList = (userId, updater) => {
  const snapshot = getLocalSnapshot();
  const employees = Array.isArray(snapshot.employees) ? [...snapshot.employees] : [];
  let updatedUser = snapshot.authUser;
  let handled = false;
  let updatedList = null;

  const updatedEmployees = employees.map((emp) => {
    if (emp.id !== userId) return emp;
    handled = true;
    const currentList = Array.isArray(emp.currentMonthAttendance)
      ? emp.currentMonthAttendance
      : [];
    const nextList = updater(currentList, emp);
    updatedList = nextList;
    const updatedEmp = { ...emp, currentMonthAttendance: nextList };
    if (updatedUser && updatedUser.id === emp.id) {
      updatedUser = { ...updatedUser, currentMonthAttendance: nextList };
    }
    return updatedEmp;
  });

  if (!handled) {
    const baseUser =
      (updatedUser && updatedUser.id === userId && updatedUser) ||
      { id: userId, name: 'User' };
    const currentList = Array.isArray(baseUser.currentMonthAttendance)
      ? baseUser.currentMonthAttendance
      : [];
    const nextList = updater(currentList, baseUser);
    updatedList = nextList;
    updatedEmployees.push({ ...baseUser, currentMonthAttendance: nextList });
    if (updatedUser && updatedUser.id === userId) {
      updatedUser = { ...updatedUser, currentMonthAttendance: nextList };
    }
  } else if (updatedUser && updatedUser.id === userId && !updatedList) {
    const currentList = Array.isArray(updatedUser.currentMonthAttendance)
      ? updatedUser.currentMonthAttendance
      : [];
    const nextList = updater(currentList, updatedUser);
    updatedList = nextList;
    updatedUser = { ...updatedUser, currentMonthAttendance: nextList };
  }

  persistLocalSnapshot({ authUser: updatedUser, employees: updatedEmployees });
  return { updatedUser, updatedEmployees, updatedList };
};

const handleAttendanceClockLocal = async (
  attendanceType,
  photoData = {},
  workSettings = {},
  permissionData = null
) => {
  const snapshot = getLocalSnapshot();
  const user = snapshot.authUser;
  if (!user) {
    throw new Error('User not logged in.');
  }

  const now = new Date();
  const date = now.toISOString().split('T')[0];
  const time = now.toTimeString().slice(0, 5);
  const startTime = workSettings.startTime || DEFAULT_WORK_HOURS.startTime;
  const endTime = workSettings.endTime || DEFAULT_WORK_HOURS.endTime;

  const isLate = attendanceType === 'In' && time > startTime;
  const isEarlyLeave = attendanceType === 'Out' && time < endTime;
  const lateDuration = isLate
    ? calculateMinutesDiff(time, startTime)
    : permissionData?.lateDuration || 0;

  const newRecord = {
    id: Date.now(),
    user_id: user.id,
    name: user.name,
    date,
    time,
    type: attendanceType === 'In' ? 'Clock In' : 'Clock Out',
    location: DEFAULT_LOCATION.name,
    coordinates: photoData.latitude && photoData.longitude
      ? `${photoData.latitude}, ${photoData.longitude}`
      : `${DEFAULT_LOCATION.latitude}, ${DEFAULT_LOCATION.longitude}`,
    latitude: photoData.latitude || DEFAULT_LOCATION.latitude,
    longitude: photoData.longitude || DEFAULT_LOCATION.longitude,
    isLate,
    isEarlyLeave,
    lateDuration,
    reason: permissionData?.description || '',
    description: permissionData?.description || '',
    permissionNote: permissionData?.note || '',
    permissionFile: permissionData?.file || '',
    hasPermission: Boolean(permissionData),
    permissionType: permissionData
      ? permissionData.type === 'Out'
        ? 'early_out'
        : 'late'
      : '',
    needsApproval: Boolean(permissionData?.note || permissionData?.description || isLate || isEarlyLeave),
    status: 'pending',
    photo: photoData.file || null,
  };

  updateLocalAttendanceList(user.id, (prev) => [newRecord, ...prev]);

  return {
    success: true,
    newRecord,
    isLate,
    isEarlyLeave,
    lateDuration,
  };
};

const approveAttendanceLocal = (recordId, status) => {
  if (!recordId) {
    throw new Error('Invalid attendance ID.');
  }
  const snapshot = getLocalSnapshot();
  let recordUpdated = null;
  const employees = snapshot.employees.map((emp) => {
    const list = Array.isArray(emp.currentMonthAttendance) ? emp.currentMonthAttendance : [];
    if (!list.some((record) => record.id === recordId)) return emp;
    const updatedList = list.map((record) => {
      if (record.id !== recordId) return record;
      recordUpdated = {
        ...record,
        status,
        needsApproval: false,
      };
      return recordUpdated;
    });
    return { ...emp, currentMonthAttendance: updatedList };
  });

  if (!recordUpdated) {
    throw new Error('Attendance data not found.');
  }

  let authUser = snapshot.authUser;
  if (authUser?.id === recordUpdated.user_id || authUser?.id === recordUpdated.userId) {
    const history = Array.isArray(authUser.currentMonthAttendance)
      ? authUser.currentMonthAttendance
      : [];
    authUser = {
      ...authUser,
      currentMonthAttendance: history.map((record) =>
        record.id === recordId ? { ...record, status, needsApproval: false } : record
      ),
    };
  }

  persistLocalSnapshot({ authUser, employees });

  return { success: true, data: recordUpdated };
};

const buildClockPayload = (attendanceType, photoData = {}, permissionData = null) => {
  const coordinates =
    photoData.latitude && photoData.longitude
      ? `${photoData.latitude}, ${photoData.longitude}`
      : `${DEFAULT_LOCATION.latitude}, ${DEFAULT_LOCATION.longitude}`;
  const payload = {
    type: attendanceType === 'In' ? 'clock_in' : 'clock_out',
    photoUrl: photoData.file || photoData.base64 || null,
    location: photoData.location || DEFAULT_LOCATION.name,
    coordinates,
    permission: permissionData
      ? {
          type: permissionData.type === 'Out' ? 'early_leave' : 'late',
          note: permissionData.note || '',
          description: permissionData.description || '',
          durationMinutes: permissionData.lateDuration,
        }
      : null,
  };
  return payload;
};

const ensureApiFetch = (apiFetch) => typeof apiFetch === 'function';

const wrapApiError = (error, fallbackMessage) => {
  if (error?.payload) throw error;
  const err = new Error(error?.message || fallbackMessage);
  if (error?.status) err.status = error.status;
  err.payload = error?.payload || { message: err.message };
  throw err;
};

export const fetchAttendanceHistory = async (apiFetch) => {
  if (!ensureApiFetch(apiFetch)) {
    return fetchAttendanceHistoryLocal();
  }
  try {
    const response = await apiFetch(API_ROUTES.history);
    const list = normalizeListResponse(response).map((item) => normalizeAttendanceRecord(item));
    return list;
  } catch (error) {
    wrapApiError(error, 'Failed to fetch attendance data.');
  }
};

export const fetchAllAttendanceHistory = async (apiFetch) => {
  if (!ensureApiFetch(apiFetch)) {
    return fetchAllAttendanceHistoryLocal();
  }
  try {
    const response = await apiFetch(`${API_ROUTES.all}?scope=all`);
    const list = normalizeListResponse(response).map((item) => normalizeAttendanceRecord(item));
    return list;
  } catch (error) {
    wrapApiError(error, 'Failed to fetch team attendance data.');
  }
};

export const handleAttendanceClock = async (
  apiFetch,
  attendanceType,
  photoData,
  workSettings,
  permissionData = null
) => {
  if (!ensureApiFetch(apiFetch)) {
    return handleAttendanceClockLocal(attendanceType, photoData, workSettings, permissionData);
  }

  try {
    const payload = buildClockPayload(attendanceType, photoData, permissionData);
    const response = await apiFetch(API_ROUTES.clock, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const newRecord = normalizeAttendanceRecord(response?.data || response);
    return {
      success: true,
      newRecord,
      isLate: newRecord.isLate,
      isEarlyLeave: newRecord.isEarlyLeave,
      lateDuration: newRecord.lateDuration,
    };
  } catch (error) {
    wrapApiError(error, 'Failed to process attendance.');
  }
};

export const approveAttendance = async (apiFetch, recordId, status = 'approved') => {
  if (!ensureApiFetch(apiFetch)) {
    return approveAttendanceLocal(recordId, status);
  }

  try {
    const response = await apiFetch(API_ROUTES.review(recordId), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ status }),
    });
    return {
      success: response?.success !== false,
      data: response,
    };
  } catch (error) {
    wrapApiError(error, 'Failed to update attendance status.');
  }
};
