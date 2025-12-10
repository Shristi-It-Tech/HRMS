import React from 'react';
import TimesheetsPage from './TimesheetsPage';

const EmployeeLoginHistory = () => {
  // History should show calendar-only view of timesheets
  return <TimesheetsPage showCalendar showWeek={false} />;
};

export default EmployeeLoginHistory;
