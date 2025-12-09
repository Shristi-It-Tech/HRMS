import React, { useEffect, useMemo, useState } from 'react';
import { GlassCard } from '../UI/Cards';
import { useAuth } from '../../hooks/useAuth';
import { fetchAttendanceHistory } from '../../api/attendanceApi';

const formatDateTime = (date, time) => {
  const d = date || '';
  const t = time || '';
  return `${d}${d && t ? ' ' : ''}${t}`;
};

const statusBadge = (status) => {
  switch (status) {
    case 'Login Success':
      return 'text-green-700 bg-green-100';
    case 'Logout Success':
      return 'text-blue-700 bg-blue-100';
    default:
      return 'text-gray-700 bg-gray-100';
  }
};

const attendanceBadge = (attStatus) => {
  if (attStatus === 'Late') return 'text-amber-700 bg-amber-100';
  if (attStatus === 'Early Checkout') return 'text-red-700 bg-red-100';
  return 'text-green-700 bg-green-100';
};

const EmployeeLoginHistory = () => {
  const { apiFetch } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await fetchAttendanceHistory(apiFetch);
        const mapped = (data || []).map((rec, idx) => ({
          id: rec.id || rec._id || idx,
          datetime: formatDateTime(rec.date, rec.time),
          status: rec.type === 'Clock In' ? 'Login Success' : 'Logout Success',
          ip: rec.location || 'Unknown',
          location: rec.location || 'Unknown',
          attendanceStatus: rec.isLate
            ? 'Late'
            : rec.isEarlyLeave
            ? 'Early Checkout'
            : 'On Time',
        }));
        setHistory(mapped);
      } catch (_) {
        setHistory([]);
      } finally {
        setLoading(false);
      }
    };
    if (apiFetch) load();
  }, [apiFetch]);

  const filteredHistory = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return history.filter(entry =>
      (entry.datetime || '').toLowerCase().includes(term) ||
      (entry.status || '').toLowerCase().includes(term) ||
      (entry.location || '').toLowerCase().includes(term) ||
      (entry.attendanceStatus || '').toLowerCase().includes(term)
    );
  }, [history, searchTerm]);

  return (
    <GlassCard className="mt-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-2xl font-bold">Login History</h2>
          <p className="text-gray-600 text-sm">Fetched from your attendance records</p>
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search date, status, location..."
          className="w-full sm:w-64 border rounded-lg px-3 py-2 text-sm"
        />
      </div>

      {loading ? (
        <p className="text-center py-6 text-gray-500">Loading history...</p>
      ) : filteredHistory.length === 0 ? (
        <p className="text-center py-6 text-gray-500">No login history found.</p>
      ) : (
        <div className="overflow-x-auto -mx-4 sm:-mx-6">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left">
                <th className="px-4 py-2 font-semibold">Date/Time</th>
                <th className="px-4 py-2 font-semibold">Status</th>
                <th className="px-4 py-2 font-semibold">Attendance</th>
                <th className="px-4 py-2 font-semibold">Location</th>
              </tr>
            </thead>
            <tbody>
              {filteredHistory.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="px-4 py-3 whitespace-nowrap text-gray-800">{item.datetime || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusBadge(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${attendanceBadge(item.attendanceStatus)}`}>
                      {item.attendanceStatus}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">{item.location}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </GlassCard>
  );
};

export default EmployeeLoginHistory;
