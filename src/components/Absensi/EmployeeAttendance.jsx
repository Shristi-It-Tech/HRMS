// src/components/Attendance/EmployeeAttendance.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { GlassCard, StatCard } from '../UI/Cards';
import { PrimaryButton } from '../UI/Buttons';
import { handleAttendanceClock, fetchAttendanceHistory, fetchAllAttendanceHistory, approveAttendance } from '../../api/attendanceApi';
import { useAuth } from '../../hooks/useAuth'; 
import { showSwal } from '../../utils/swal'; 

// Helper to determine view mode based on permissions
const getViewMode = (hasPermission) => {
  if (hasPermission('attendance:show')) return 'company';
  if (hasPermission('attendance:view')) return 'team';
  return 'personal';
};

const getViewTitle = (viewMode, userName = '') => {
  switch(viewMode) {
    case 'company': return 'Company Attendance Dashboard';
    case 'team': return 'Team Attendance Dashboard';
    default: return `Attendance Dashboard${userName ? ' ' + userName : ''}`;
  }
};

// Helper check used by CurrentStatusCard to determine missed clock outs
const checkNoClockOut = (attendanceList, todayDate) => {
  if (!attendanceList || !Array.isArray(attendanceList)) return false;
  const sortedAttendance = [...attendanceList].sort((a, b) => new Date(`${b.date} ${b.time || '00:00:00'}`) - new Date(`${a.date} ${a.time || '00:00:00'}`));
  const lastClockInRecord = sortedAttendance.find(att => att.type === 'Clock In');
  if (!lastClockInRecord) return false;
  const lastClockOutRecord = sortedAttendance
    .filter(att => att.type === 'Clock Out' && new Date(att.date) <= new Date(lastClockInRecord.date))
    .sort((a, b) => new Date(`${b.date} ${b.time || '00:00:00'}`) - new Date(`${a.date} ${a.time || '00:00:00'}`))[0];
  if (!lastClockOutRecord || new Date(lastClockOutRecord.date) < new Date(lastClockInRecord.date)) {
    if (lastClockOutRecord && lastClockOutRecord.date === lastClockInRecord.date) {
      const clockInTime = new Date(`${lastClockInRecord.date} ${lastClockInRecord.time}`);
      const clockOutTime = new Date(`${lastClockOutRecord.date} ${lastClockOutRecord.time}`);
      if (clockOutTime < clockInTime) return true;
    }
    return true;
  }
  return false;
};

const CurrentStatusCard = ({ lastAttendance, isClockedIn, isSuccessEffect, canViewDetails, hasNoClockOut }) => {
  return (
    <div className={`text-center mb-6 p-4 rounded-xl transition-all duration-500 ${
      isSuccessEffect 
        ? 'bg-green-100 border border-green-300' 
        : 'bg-[#708993]/5 border border-[#708993]/10'
    }`}>
      <div className="flex items-center justify-center mb-3">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
          isClockedIn || hasNoClockOut ? 'bg-green-100' : 'bg-gray-100'
        }`}>
          <i className={`fas ${isClockedIn ? 'fa-check-circle' : 'fa-clock'} text-xl ${
            isClockedIn || hasNoClockOut ? 'text-green-600' : 'text-gray-400'
          }`}></i>
        </div>
      </div>
      <p className="text-base font-semibold text-gray-700 mb-1">Current Status</p>
      <p className={`text-xl font-bold mb-2 ${
        isClockedIn ? 'text-green-600' : hasNoClockOut ? 'text-red-600' : 'text-[#708993]'
      }`}>
        {isClockedIn ? 'WORKING' : hasNoClockOut ? 'MISSED CLOCK OUT' : 'NOT CLOCKED IN'}
      </p>
      {lastAttendance && canViewDetails && (
        <p className="text-xs text-gray-500">
          Last: {lastAttendance.type} • {lastAttendance.date} • {lastAttendance.time}
          {lastAttendance.reason && (
            <span className="block text-xs text-gray-400 mt-1">
              Reason: {lastAttendance.reason}
            </span>
          )}
        </p>
      )}
    </div>
  );
};

const ClockButtons = ({ 
  isClocking, 
  attendanceType, 
  handleClock,
  canClockInToday,   // ✅ final boolean: can clock-in today?
  canClockOutToday   // ✅ final boolean: can clock-out today?
}) => {
  return (
    <div className="flex flex-col sm:flex-row justify-center gap-3 mb-6">
      <button
        onClick={() => handleClock('In')}
        disabled={!canClockInToday || isClocking}
        className={`flex-1 py-3 px-4 rounded-xl font-medium text-white transition-all duration-300 flex items-center justify-center border-none focus:outline-none ${
          !canClockInToday
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-[#708993] hover:bg-[#5a6f7a] shadow-md hover:shadow-lg'
        }`}
      >
        <i className="fas fa-sign-in-alt mr-2 text-base"></i>
        {isClocking && attendanceType === 'In' ? (
          <span>PROCESSING...</span>
        ) : (
          <span>CLOCK IN</span>
        )}
      </button>
      <button
        onClick={() => handleClock('Out')}
        disabled={!canClockOutToday || isClocking}
        className={`flex-1 py-3 px-4 rounded-xl font-medium text-white transition-all duration-300 flex items-center justify-center border-none focus:outline-none ${
          !canClockOutToday
            ? 'bg-gray-400 cursor-not-allowed'
            : 'bg-red-500 hover:bg-red-600 shadow-md hover:shadow-lg'
        }`}
      >
        <i className="fas fa-sign-out-alt mr-2 text-base"></i>
        {isClocking && attendanceType === 'Out' ? (
          <span>PROCESSING...</span>
        ) : (
          <span>CLOCK OUT</span>
        )}
      </button>
    </div>
  );
};

const AttendanceStats = ({ attendanceHistory, viewMode, teamStats }) => {
  const totalNoClockOut = attendanceHistory.filter(a => a.isNoClockOut).length;
  const totalLate = attendanceHistory.filter(a => a.isLate).length;
  const totalEarlyOut = attendanceHistory.filter(a => a.isEarlyLeave).length;
  const totalWorkDays = attendanceHistory.filter(a => a.type === 'Clock In').length;

  if (viewMode === 'team') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <div className="bg-white p-3 rounded-xl border border-[#708993]/10 shadow-sm">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mr-2">
              <i className="fas fa-users text-blue-600 text-sm"></i>
            </div>
            <div>
              <p className="text-xs text-gray-600">Total Team</p>
              <p className="text-lg font-bold text-[#708993]">{teamStats.totalMembers}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-[#708993]/10 shadow-sm">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center mr-2">
              <i className="fas fa-user-check text-green-600 text-sm"></i>
            </div>
            <div>
              <p className="text-xs text-gray-600">Present Today</p>
              <p className="text-lg font-bold text-[#708993]">{teamStats.presentToday}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-[#708993]/10 shadow-sm">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center mr-2">
              <i className="fas fa-hourglass-end text-yellow-600 text-sm"></i>
            </div>
            <div>
              <p className="text-xs text-gray-600">Late</p>
              <p className="text-lg font-bold text-[#708993]">{teamStats.lateToday}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-[#708993]/10 shadow-sm">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center mr-2">
              <i className="fas fa-user-times text-red-600 text-sm"></i>
            </div>
            <div>
              <p className="text-xs text-gray-600">Absent</p>
              <p className="text-lg font-bold text-[#708993]">{teamStats.absentToday}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
      <div className="bg-white p-3 rounded-xl border border-[#708993]/10 shadow-sm">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center mr-2">
            <i className="fas fa-calendar-alt text-blue-600 text-sm"></i>
          </div>
          <div>
            <p className="text-xs text-gray-600">Total Workdays</p>
            <p className="text-lg font-bold text-[#708993]">{totalWorkDays}</p>
          </div>
        </div>
      </div>
      <div className="bg-white p-3 rounded-xl border border-[#708993]/10 shadow-sm">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center mr-2">
            <i className="fas fa-hourglass-end text-yellow-600 text-sm"></i>
          </div>
          <div>
            <p className="text-xs text-gray-600">Late Arrivals</p>
            <p className="text-lg font-bold text-[#708993]">{totalLate}</p>
          </div>
        </div>
      </div>
      <div className="bg-white p-3 rounded-xl border border-[#708993]/10 shadow-sm">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center mr-2">
            <i className="fas fa-door-open text-red-600 text-sm"></i>
          </div>
          <div>
            <p className="text-xs text-gray-600">Early Departures</p>
            <p className="text-lg font-bold text-[#708993]">{totalEarlyOut}</p>
          </div>
        </div>
      </div>
      <div className="bg-white p-3 rounded-xl border border-[#708993]/10 shadow-sm">
        <div className="flex items-center">
          <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center mr-2">
            <i className="fas fa-times-circle text-red-600 text-sm"></i>
          </div>
          <div>
            <p className="text-xs text-gray-600">Missed Clock Out</p>
            <p className="text-lg font-bold text-[#708993]">{totalNoClockOut}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const AttendanceHistory = ({ groupedAttendance, canViewDetails, canApproveAttendance, onApproveAttendance }) => {
  return (
    <div className="p-4 md:p-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-4">
        <div className="mb-3 lg:mb-0">
          <h3 className="text-xl md:text-2xl font-bold text-[#708993] mb-1">Attendance History This Month</h3>
          <p className="text-gray-600 text-sm">Summary of presence and absence</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center text-xs text-gray-600">
            <div className="w-2 h-2 rounded-full bg-green-500 mr-1"></div>
            <span>On Time</span>
          </div>
          <div className="flex items-center text-xs text-gray-600">
            <div className="w-2 h-2 rounded-full bg-yellow-500 mr-1"></div>
            <span>Late</span>
          </div>
          <div className="flex items-center text-xs text-gray-600">
            <div className="w-2 h-2 rounded-full bg-purple-500 mr-1"></div>
            <span>Left Early</span>
          </div>
          <div className="flex items-center text-xs text-gray-600">
            <div className="w-2 h-2 rounded-full bg-blue-500 mr-1"></div>
            <span>With Permission</span>
          </div>
          <div className="flex items-center text-xs text-gray-600">
            <div className="w-2 h-2 rounded-full bg-red-500 mr-1"></div>
            <span>No Clock Out</span>
          </div>
        </div>
      </div>
      
      {/* Responsive Table */}
      <div className="overflow-x-auto rounded-xl border border-[#708993]/10 bg-white/20">
        <table className="w-full min-w-[600px]">
          <thead>
            <tr className="bg-[#708993] text-white">
              <th className="px-4 py-3 text-left font-semibold text-sm rounded-tl-xl">Date</th>
              <th className="px-4 py-3 text-left font-semibold text-sm">Clock In</th>
              <th className="px-4 py-3 text-left font-semibold text-sm">Clock Out</th>
              <th className="px-4 py-3 text-left font-semibold text-sm">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-sm">Permission</th>
              {canApproveAttendance && (
                <th className="px-4 py-3 text-left font-semibold text-sm rounded-tr-xl">Action</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {groupedAttendance.map((record) => (
              <tr key={record.date} className="hover:bg-gray-50 transition-colors duration-200">
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="font-medium text-gray-900 text-sm">{record.date}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <div className="flex items-center">
                      <span className="font-medium text-gray-900 text-sm">{record.clockIn || '-'}</span>
                      {record.isLate && (
                        <span className="ml-2 px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded-full font-medium">
                          Late
                        </span>
                      )}
                      {record.hasPermission && record.permissionType === 'late' && (
                        <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full font-medium">
                          <i className="fas fa-file-alt mr-1"></i>
                          Permission
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center">
                    <span className="font-medium text-gray-900 text-sm">{record.clockOut || '-'}</span>
                    {record.isEarlyLeave && (
                      <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded-full font-medium">
                        Left Early
                      </span>
                    )}
                    {record.hasPermission && record.permissionType === 'early_out' && (
                      <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full font-medium">
                        <i className="fas fa-file-alt mr-1"></i>
                        Permission
                      </span>
                    )}
                    {record.isNoClockOut && (
                      <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded-full font-medium">
                        No Clock Out
                        <i className="fas fa-times-circle ml-1"></i>
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                    record.isLate 
                      ? 'bg-yellow-100 text-yellow-800'
                      : record.isEarlyLeave
                      ? 'bg-red-100 text-red-800'
                      : record.isNoClockOut
                      ? 'bg-red-100 text-red-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {record.isLate && <i className="fas fa-clock mr-1"></i>}
                    {record.isEarlyLeave && <i className="fas fa-running mr-1"></i>}
                    {record.isNoClockOut && <i className="fas fa-times-circle mr-1"></i>}
                    {!record.isLate && !record.isEarlyLeave && !record.isNoClockOut && <i className="fas fa-check-circle mr-1"></i>}
                    {record.isLate 
                      ? 'Late' 
                      : record.isEarlyLeave 
                        ? 'Left Early' 
                        : record.isNoClockOut 
                          ? 'No Clock Out' 
                          : 'On Time'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {record.permissionNote ? (
                    <div className="flex items-center">
                      <i className="fas fa-file-text text-blue-500 mr-2 text-sm"></i>
                      <span className="text-blue-600 text-sm">{record.permissionNote}</span>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm">-</span>
                  )}
                </td>
                {canApproveAttendance && (
                  <td className="px-4 py-3">
                    {record.needsApproval && (
                      <button
                        onClick={() => onApproveAttendance(record)}
                        className="px-2 py-1 bg-green-500 hover:bg-green-600 text-white rounded-lg text-xs font-medium transition-colors"
                      >
                        <i className="fas fa-check mr-1"></i>
                        Approve
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {groupedAttendance.length === 0 && (
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
            <i className="fas fa-clipboard-list text-gray-400 text-2xl"></i>
          </div>
          <p className="text-gray-500 font-medium mb-1">No attendance history yet</p>
          <p className="text-gray-400 text-sm">This month's attendance will appear here</p>
        </div>
      )}
    </div>
  );
};

const TeamAttendanceList = ({ employees, onEmployeeSelect, viewMode, WORK_START, WORK_END }) => {
  const getListTitle = () => {
    switch(viewMode) {
      case 'team': return 'Team Attendance';
      case 'company': return 'All Employee Attendance';
      default: return 'Employee Attendance';
    }
  };
  const currentTime = new Date().toTimeString().slice(0, 5);
  const isWorkTime = currentTime >= WORK_START && currentTime <= WORK_END;
  return (
    <div className="mt-6">
      <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
        <i className="fas fa-users mr-2 text-blue-500"></i>
        {getListTitle()}
      </h3>
      <div className="overflow-x-auto rounded-xl border border-[#708993]/10 bg-white/20">
        <table className="w-full min-w-[600px]">
          <thead className="bg-white/10">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-800">Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-800">Division</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-800">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-800">Clock In</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-800">Clock Out</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-800">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {employees.map((employee) => {
              const lastAttendance = employee.currentMonthAttendance && employee.currentMonthAttendance.length > 0 
                ? employee.currentMonthAttendance[0] 
                : null;
              const isClockedIn = lastAttendance && lastAttendance.type === 'Clock In';
              const hasNoClockOut = checkNoClockOut(employee.currentMonthAttendance || [], new Date().toISOString().split('T')[0]);
              return (
                <tr key={employee.id} className="hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-800 font-medium">{employee.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{employee.division}</td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      isClockedIn 
                        ? 'bg-green-100 text-green-800'
                        : hasNoClockOut 
                        ? 'bg-red-100 text-red-800'
                        : isWorkTime
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {isClockedIn ? 'Present' : hasNoClockOut ? 'Missed Clock Out' : isWorkTime ? 'Not Yet Present' : 'Outside Work Hours'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-800">
                    {lastAttendance && lastAttendance.type === 'Clock In' 
                      ? `${lastAttendance.date} ${lastAttendance.time}`
                      : '-'
                    }
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-800">
                    {lastAttendance && lastAttendance.type === 'Clock Out' 
                      ? `${lastAttendance.date} ${lastAttendance.time}`
                      : '-'
                    }
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <button 
                      onClick={() => onEmployeeSelect(employee)}
                      className="px-2 py-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-600 rounded-lg text-xs font-medium transition-colors"
                    >
                      <i className="fas fa-eye mr-1"></i>
                      Detail
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const EmployeeAttendance = ({ user = {}, setEmployees = () => {}, employees = [], onEmployeeSelect = () => {} }) => {
  const { authUser, permissions, hasPermission, apiFetch } = useAuth();
  const role = user.role || 'employee';
  const [lastAttendance, setLastAttendance] = useState(null);
  const [attendanceHistory, setAttendanceHistory] = useState([]);
  const [groupedAttendance, setGroupedAttendance] = useState([]);
  const [isClocking, setIsClocking] = useState(false);
  const [attendanceType, setAttendanceType] = useState('');
  const [isSuccessEffect, setIsSuccessEffect] = useState(false);
  const [loading, setLoading] = useState(true);
  const [allAttendanceFetched, setAllAttendanceFetched] = useState(false);
  const [allAttendanceData, setAllAttendanceData] = useState([]);

  const WORK_START = "09:00";
  const WORK_END = "17:00";
  const viewMode = getViewMode(hasPermission);
  const canClockIn = hasPermission('attendance:clock_in');
  const canClockOut = hasPermission('attendance:clock_out');
  const canViewTeamAttendance = hasPermission('attendance:view');
  const canViewAttendanceDetail = hasPermission('attendance:show');
  const canApproveAttendance = hasPermission('attendance:review');
  const canViewAttendance = canClockIn || canClockOut || canViewTeamAttendance || canViewAttendanceDetail;

  const teamStats = useMemo(() => {
    if (!employees.length) return { totalMembers: 0, presentToday: 0, lateToday: 0, absentToday: 0 };
    const today = new Date().toISOString().split('T')[0];
    let presentToday = 0;
    let lateToday = 0;
    let absentToday = 0;
    employees.forEach(emp => {
      if (emp.currentMonthAttendance) {
        const todayAttendance = emp.currentMonthAttendance.find(a => a.date === today);
        if (todayAttendance) {
          if (todayAttendance.type === 'Clock In') {
            presentToday++;
            if (todayAttendance.isLate) lateToday++;
          }
        } else {
          absentToday++;
        }
      } else {
        absentToday++;
      }
    });
    return {
      totalMembers: employees.length,
      presentToday,
      lateToday,
      absentToday
    };
  }, [employees]);

  // 🔥 CALCULATE TODAY STATUS
const today = new Date().toISOString().split('T')[0];
const todayRecords = attendanceHistory.filter(r => r.date === today);
const hasClockedInToday = todayRecords.some(r => r.type === 'Clock In');
const hasClockedOutToday = todayRecords.some(r => r.type === 'Clock Out');

const canClockInToday = canClockIn && !hasClockedInToday;
const canClockOutToday = canClockOut && hasClockedInToday && !hasClockedOutToday;

  // 🔥 FETCH ATTENDANCE HISTORY — TANPA LOGIKA isNoClockOut DI SINI
  useEffect(() => {
    if (!canViewAttendance) {
      setLoading(false);
      return;
    }
    const fetchAttendance = async () => {
      try {
        const fetchedAttendances = await fetchAttendanceHistory(apiFetch);
        setAttendanceHistory(fetchedAttendances);
        if (fetchedAttendances.length > 0) {
          const sorted = [...fetchedAttendances].sort((a, b) => {
            const dateA = new Date(`${a.date} ${a.time || '00:00:00'}`);
            const dateB = new Date(`${b.date} ${b.time || '00:00:00'}`);
            return dateB - dateA;
          });
          setLastAttendance(sorted[0]);
        } else {
          setLastAttendance(null);
        }
      } catch (error) {
        console.error('Failed to fetch attendance:', error);
        if (error.status !== 403) {
          showSwal('Error', error.payload?.message || error.message || 'Failed to fetch attendance data.', 'error', 2000);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchAttendance();
  }, [apiFetch, canViewAttendance]);

  // 🔥 FETCH SHIFT
  useEffect(() => {
    if (!canViewAttendance || !apiFetch) return;
    const fetchUserShift = async () => {
      try {
        const shiftData = await apiFetch('/api/my-shift');
        const shift = shiftData?.shift || shiftData;
        setUserShift(shift);
      } catch (error) {
        console.error('Failed to fetch user shift:', error);
      }
    };
    fetchUserShift();
  }, [apiFetch, canViewAttendance]);

  // 🔥 FETCH ALL ATTENDANCE (TIM)
  useEffect(() => {
    if (!canViewAttendance || viewMode === 'personal' || allAttendanceFetched) return;
    const fetchAllAttendance = async () => {
      try {
        const allAttendance = await fetchAllAttendanceHistory(apiFetch);
        if (setEmployees && employees.length > 0) {
          const attendanceByUser = allAttendance.reduce((acc, record) => {
            if (!acc[record.user_id]) acc[record.user_id] = [];
            acc[record.user_id].push(record);
            return acc;
          }, {});
          setEmployees(prev =>
            prev.map(emp => ({
              ...emp,
              currentMonthAttendance: attendanceByUser[emp.id] || []
            }))
          );
        }
        setAllAttendanceFetched(true);
      } catch (error) {
        console.error('Failed to fetch all attendance:', error);
        if (error.status !== 403) {
          showSwal('Error', error.payload?.message || error.message || 'Failed to fetch team attendance data.', 'error', 2000);
        }
      }
    };
    fetchAllAttendance();
  }, [apiFetch, canViewAttendance, viewMode, allAttendanceFetched, setEmployees, employees]);

  // 🔥 CORRECT GROUPING — NO LONGER OVERWRITING STATUS
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const grouped = attendanceHistory.reduce((acc, record) => {
      const date = record.date;
      if (!acc[date]) {
        acc[date] = {
          date,
          clockIn: null,
          clockOut: null,
          isLate: false,
          isEarlyLeave: false,
          isNoClockOut: false,
          description: '',
          permissionNote: '',
          permissionFile: '',
          hasPermission: false,
          permissionType: '',
          needsApproval: false,
        };
      }
      if (record.type === 'Clock In') {
        acc[date].clockIn = record.time;
        acc[date].isLate = record.isLate;
        acc[date].description = record.description || acc[date].description;
        if (record.hasPermission) {
          acc[date].permissionNote = record.permissionNote;
          acc[date].hasPermission = true;
          acc[date].permissionType = 'late';
        }
        if (record.permissionFile) {
          acc[date].permissionFile = record.permissionFile;
        }
      } else if (record.type === 'Clock Out') {
        acc[date].clockOut = record.time;
        acc[date].isEarlyLeave = record.isEarlyLeave;
        acc[date].description = record.description || acc[date].description;
        if (record.hasPermission) {
          acc[date].permissionNote = record.permissionNote;
          acc[date].hasPermission = true;
          acc[date].permissionType = 'early_out';
        }
        if (record.permissionFile) {
          acc[date].permissionFile = record.permissionFile;
        }
      }
      if (record.needsApproval) {
        acc[date].needsApproval = true;
      }
      return acc;
    }, {});

    const array = Object.keys(grouped).map(date => {
      const rec = grouped[date];
      let status = 'Not Yet Clocked In';
      let isNoClockOut = false;

      if (date < today) {
        if (rec.clockIn && !rec.clockOut) {
          status = 'No Clock Out';
          isNoClockOut = true;
        } else if (rec.isLate) {
          status = 'Late';
        } else if (rec.isEarlyLeave) {
          status = 'Left Early';
        } else if (rec.clockIn && rec.clockOut) {
          status = 'On Time';
        }
      } else if (date === today) {
        if (rec.clockIn && rec.clockOut) {
          if (rec.isLate) status = 'Late';
          else if (rec.isEarlyLeave) status = 'Left Early';
          else status = 'On Time';
        } else if (rec.clockIn) {
          status = 'Not Yet Clocked Out';
        } else {
          status = 'Not Yet Clocked In';
        }
      }

      return {
        ...rec,
        status,
        isNoClockOut
      };
    }).sort((a, b) => new Date(b.date) - new Date(a.date));

    setGroupedAttendance(array);
  }, [attendanceHistory]);

  const handleClock = async (type) => {
    if (isClocking) return;
    setIsClocking(true);
    setAttendanceType(type);
    try {
      const result = await handleAttendanceClock(apiFetch, type, {}, null);
      if (!result?.success) throw new Error('Invalid response received.');
      const { newRecord } = result;
      setLastAttendance(newRecord);
      setAttendanceHistory(prev => [newRecord, ...prev]);
      if (authUser && setEmployees) {
        setEmployees(prev =>
          prev.map(emp =>
            emp.id === authUser.id
              ? { ...emp, currentMonthAttendance: [newRecord, ...(emp.currentMonthAttendance || [])] }
              : emp
          )
        );
      }
      setIsSuccessEffect(true);
      setTimeout(() => setIsSuccessEffect(false), 2000);
      showSwal('Success', `Clock ${type} successful!`, 'success', 1500);
    } catch (err) {
      console.error('Attendance process failed:', err);
      showSwal('Error', err.payload?.message || err.message || `Failed to clock ${type}`, 'error');
    } finally {
      setIsClocking(false);
    }
  };

  const onApproveAttendance = (record) => {
    if (!canApproveAttendance) {
      showSwal('Permission Denied', 'You do not have permission to approve attendance.', 'error', 2000);
      return;
    }
    const recordId = record.id;
    if (!recordId) {
      showSwal('Error', 'Attendance ID not found.', 'error', 2000);
      return;
    }
    showSwal({
      title: 'Approve Attendance Permission?',
      text: `Are you sure you want to approve the attendance permission for ${record.date}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Approve',
      cancelButtonText: 'Cancel',
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const response = await approveAttendance(apiFetch, recordId, 'approved');
          if (response.success) {
            setAttendanceHistory(prev => prev.map(item => item.id === recordId ? { ...item, status: 'approved', needsApproval: false } : item));
            setGroupedAttendance(prev => prev.map(item => item.date === record.date ? { ...item, needsApproval: false } : item));
            showSwal('Approved!', 'Attendance permission approved.', 'success', 2000);
          } else {
            throw new Error(response.message || 'Failed to approve permission');
          }
        } catch (err) {
          console.error('Failed to approve attendance:', err);
          const errorMessage = err.payload?.message || err.message || 'Failed to approve attendance permission';
          showSwal('Error', errorMessage, 'error');
        }
      }
    });
  };

  if (!canViewAttendance) {
    return (
      <GlassCard className="mt-6 relative overflow-hidden backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl">
        <div className="p-8 text-center">
          <div className="w-24 h-24 rounded-2xl bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <i className="fas fa-exclamation-triangle text-red-500 text-3xl"></i>
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Access Denied</h3>
          <p className="text-gray-600">You do not have permission to view this page.</p>
        </div>
      </GlassCard>
    );
  }

  return (
    <>
      <GlassCard className="mt-6 relative overflow-hidden backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl">
        {isClocking && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center z-20 rounded-3xl">
            <div className="text-center">
              <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-[#708993] mx-auto mb-4"></div>
              <p className="text-[#708993] font-medium">Processing attendance...</p>
            </div>
          </div>
        )}
        <div className="p-4 md:p-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl md:text-3xl font-bold text-[#708993] mb-2">Hello, {user.name} 👋</h2>
            <p className="text-gray-600">
              {viewMode === 'personal' ? 'Please submit your attendance first' : 'Manage team attendance'}
            </p>
          </div>
          {viewMode === 'personal' && (
            <CurrentStatusCard lastAttendance={lastAttendance} isClockedIn={hasClockedInToday} isSuccessEffect={isSuccessEffect} canViewDetails={canViewAttendance} hasNoClockOut={hasNoClockOut} />
          )}
          <ClockButtons  isClocking={isClocking} attendanceType={attendanceType} handleClock={handleClock} canClockInToday={canClockInToday} canClockOutToday={canClockOutToday} />
          <AttendanceStats attendanceHistory={attendanceHistory} viewMode={viewMode} teamStats={teamStats} />
        </div>
      </GlassCard>
      <GlassCard className="mt-6 relative overflow-hidden backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl">
        <AttendanceHistory groupedAttendance={groupedAttendance} canViewDetails={canViewAttendance} canApproveAttendance={canApproveAttendance} onApproveAttendance={onApproveAttendance} />
      </GlassCard>
      {(canViewTeamAttendance || canViewAttendanceDetail) && (
        <TeamAttendanceList employees={employees} onEmployeeSelect={onEmployeeSelect} viewMode={viewMode} WORK_START={WORK_START} WORK_END={WORK_END} />
      )}
    </>
  );
};

export default EmployeeAttendance;
