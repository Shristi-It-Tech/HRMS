const localKey = (userId) => `timesheets:${userId || 'anonymous'}`;

const readLocalTimesheets = (userId) => {
  try {
    const raw = localStorage.getItem(localKey(userId));
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const writeLocalTimesheets = (userId, list) => {
  try {
    localStorage.setItem(localKey(userId), JSON.stringify(list));
  } catch {
    /* ignore */
  }
};

const shouldFallback = (error) => {
  const message = (error?.payload?.message || error?.message || '').toLowerCase();
  return message.includes('session') || message.includes('token') || error?.status === 401;
};

const normalizeResponse = (response) => (Array.isArray(response) ? response : response?.data || []);

export const submitTimesheet = async (apiFetch, { projectId, projectName, date, startTime, endTime, description, user }) => {
  if (!projectId || !date || !startTime || !endTime) {
    throw new Error('Missing required fields');
  }
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  if (endMinutes <= startMinutes) {
    throw new Error('End time must be after start time');
  }
  try {
    const response = await apiFetch('/api/timesheets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, projectName, date, startTime, endTime, description }),
    });
    return response;
  } catch (error) {
    if (shouldFallback(error)) {
      const userId = user?._id || user?.id || 'anonymous';
      const newEntry = {
        _id: `local-${Date.now()}`,
        userId,
        projectId,
        projectName: projectName || '',
        date,
        startTime,
        endTime,
        description: description || '',
        status: 'submitted',
        localOnly: true,
      };
      const existing = readLocalTimesheets(userId);
      writeLocalTimesheets(userId, [newEntry, ...existing]);
      return { success: true, timesheet: newEntry, localOnly: true };
    }
    throw error;
  }
};

export const updateTimesheet = async (apiFetch, id, { projectId, projectName, date, startTime, endTime, description, user }) => {
  if (!id) throw new Error('Timesheet ID required');
  if (!projectId || !date || !startTime || !endTime) {
    throw new Error('Missing required fields');
  }
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;
  if (endMinutes <= startMinutes) {
    throw new Error('End time must be after start time');
  }
  try {
    const response = await apiFetch(`/api/timesheets/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ projectId, projectName, date, startTime, endTime, description }),
    });
    return response;
  } catch (error) {
    if (shouldFallback(error)) {
      const userId = user?._id || user?.id || 'anonymous';
      const list = readLocalTimesheets(userId);
      const updated = list.map((ts) =>
        ts._id === id
          ? { ...ts, projectId, projectName: projectName || '', date, startTime, endTime, description: description || '' }
          : ts
      );
      writeLocalTimesheets(userId, updated);
      return { success: true, timesheet: { _id: id, projectId, projectName, date, startTime, endTime, description }, localOnly: true };
    }
    throw error;
  }
};

export const fetchMyTimesheets = async (apiFetch, user) => {
  try {
    const response = await apiFetch('/api/timesheets/me');
    return normalizeResponse(response);
  } catch (error) {
    const list = readLocalTimesheets(user?._id || user?.id);
    if (list.length) return list;
    throw error;
  }
};

export const fetchAllTimesheets = async (apiFetch, user) => {
  try {
    const response = await apiFetch('/api/timesheets');
    return normalizeResponse(response);
  } catch (error) {
    const list = readLocalTimesheets(user?._id || user?.id);
    if (list.length) return list;
    throw error;
  }
};

export const fetchEmployeeTimesheets = async (apiFetch, userId) => {
  try {
    const response = await apiFetch(`/api/timesheets/employee/${userId}`);
    return normalizeResponse(response);
  } catch (error) {
    throw error;
  }
};
