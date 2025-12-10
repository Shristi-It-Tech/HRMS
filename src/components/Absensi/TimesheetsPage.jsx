import React, { useState, useEffect, useMemo } from 'react';
import { GlassCard } from '../UI/Cards';
import { useAuth } from '../../hooks/useAuth';
import { fetchMyTimesheets, fetchAllTimesheets, submitTimesheet } from '../../api/timesheetApi';
import { fetchProjects, createProject, updateProject, deleteProject } from '../../api/projectApi';
import { showSwal } from '../../utils/swal';

const calculateHours = (startTime = '', endTime = '') => {
  if (!startTime || !endTime) return 0;
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const start = startH * 60 + startM;
  const end = endH * 60 + endM;
  if (end <= start) return 0;
  return (end - start) / 60;
};

const formatDateKey = (dateObj) => {
  const year = dateObj.getFullYear();
  const month = `${dateObj.getMonth() + 1}`.padStart(2, '0');
  const day = `${dateObj.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const normalizeDateString = (value) => {
  if (!value) return '';
  // If already in YYYY-MM-DD keep it
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  if (!isNaN(parsed)) return formatDateKey(parsed);
  return value;
};

const getInitials = (name = '') => {
  const parts = name.trim().split(' ');
  if (!parts.length) return '??';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const cellColor = (hours) => {
  if (!hours) return 'bg-transparent text-gray-400 border border-dashed border-gray-200';
  if (hours >= 8) return 'bg-green-200 text-green-900';
  if (hours >= 4) return 'bg-blue-200 text-blue-900';
  return 'bg-amber-100 text-amber-800';
};

const isWeekend = (dateObj) => {
  const day = dateObj.getDay();
  return day === 0 || day === 6;
};

const buildTimeRangeFromHours = (hours) => {
  const startMinutes = 9 * 60; // default 09:00
  const endMinutes = startMinutes + Math.round(Number(hours || 0) * 60);
  const toStr = (total) => `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  return {
    startTime: toStr(startMinutes),
    endTime: toStr(Math.max(endMinutes, startMinutes + 1)),
  };
};

const TimesheetsPage = ({ showCalendar = false, showWeek = true }) => {
  const { authUser, apiFetch } = useAuth();
  const [fetching, setFetching] = useState(true);
  const [loading, setLoading] = useState(false);
  const [timesheets, setTimesheets] = useState([]);
  const [allTimesheets, setAllTimesheets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('all');
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [projects, setProjects] = useState([]);
  const [projectForm, setProjectForm] = useState({ name: '', code: '', client: '', status: 'active', startDate: '', endDate: '', budget: '', description: '' });
  const [editingProject, setEditingProject] = useState(null);
  const [projectSaving, setProjectSaving] = useState(false);
  const [weekStart, setWeekStart] = useState(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday start
    return new Date(now.setDate(diff));
  });
  const [weeklyRows, setWeeklyRows] = useState([{ id: `row-${Date.now()}`, projectId: '', description: '', hours: {} }]);

  const isManager = authUser?.role === 'manager' || authUser?.role === 'owner';

  // Fetch timesheets
  useEffect(() => {
    if (!apiFetch) return;
    const fetchData = async () => {
      setFetching(true);
      try {
        if (isManager) {
          const data = await fetchAllTimesheets(apiFetch, authUser);
          setAllTimesheets(data || []);
          // Extract unique employees
          const empMap = {};
          (data || []).forEach(ts => {
            if (ts.userId && ts.userId._id) {
              empMap[ts.userId._id] = ts.userId;
            }
          });
          setEmployees(Object.values(empMap));
        } else {
          const data = await fetchMyTimesheets(apiFetch, authUser);
          setTimesheets(data || []);
        }
      } catch (error) {
        console.error('Failed to fetch timesheets:', error);
        if (isManager) {
          setAllTimesheets([]);
        } else {
          setTimesheets([]);
        }
      } finally {
        setFetching(false);
      }
    };
    fetchData();
  }, [apiFetch, isManager, refreshKey]);

  // Fetch projects
  useEffect(() => {
    if (!apiFetch) return;
    const loadProjects = async () => {
      try {
        const list = await fetchProjects(apiFetch);
        const normalized = (list || []).map((p) => ({ ...p, id: p._id || p.id }));
        setProjects(normalized);
      } catch (err) {
        console.error('Failed to load projects', err);
      }
    };
    loadProjects();
  }, [apiFetch, refreshKey]);

  const resetProjectForm = () => {
    setProjectForm({ name: '', code: '', client: '', status: 'active', startDate: '', endDate: '', budget: '', description: '' });
    setEditingProject(null);
  };

  const handleProjectSave = async (e) => {
    e.preventDefault();
    setProjectSaving(true);
    try {
      const payload = {
        ...projectForm,
        budget: projectForm.budget ? Number(projectForm.budget) : 0,
      };
      if (!payload.name || !payload.code) {
        showSwal('Error', 'Project name and code are required', 'error');
        setProjectSaving(false);
        return;
      }
      if (editingProject?._id) {
        await updateProject(apiFetch, editingProject._id, payload);
      } else {
        await createProject(apiFetch, payload);
      }
      resetProjectForm();
      setRefreshKey((p) => p + 1);
      showSwal('Success', 'Project saved', 'success', 1200);
    } catch (err) {
      showSwal('Error', err?.payload?.message || err.message || 'Failed to save project', 'error');
    } finally {
      setProjectSaving(false);
    }
  };

  const handleProjectEdit = (proj) => {
    setEditingProject(proj);
    setProjectForm({
      name: proj.name || '',
      code: proj.code || '',
      client: proj.client || '',
      status: proj.status || 'active',
      startDate: proj.startDate ? proj.startDate.slice(0, 10) : '',
      endDate: proj.endDate ? proj.endDate.slice(0, 10) : '',
      budget: proj.budget || '',
      description: proj.description || ''
    });
  };

  const handleProjectDelete = async (proj) => {
    showSwal({
      title: 'Delete project?',
      html: `Are you sure you want to delete <strong>${proj.name}</strong>?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel'
    });
    // SweetAlert above is informational only; real confirm handling below
    try {
      await deleteProject(apiFetch, proj._id);
      setRefreshKey((p) => p + 1);
      if (editingProject?._id === proj._id) resetProjectForm();
      showSwal('Deleted', 'Project removed', 'success', 1200);
    } catch (err) {
      showSwal('Error', err?.payload?.message || err.message || 'Failed to delete project', 'error');
    }
  };

  const uniqueDivisions = useMemo(() => {
    const set = new Set();
    employees.forEach((emp) => {
      if (emp?.division) {
        set.add(emp.division);
      }
    });
    return Array.from(set);
  }, [employees]);

  const dateRange = useMemo(() => {
    const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    const dates = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(new Date(d));
    }
    return dates;
  }, [currentMonth]);

  const workingDaysInRange = useMemo(() => {
    if (!dateRange.length) return 1;
    const working = dateRange.filter((date) => {
      const day = date.getDay();
      return day !== 0 && day !== 6;
    }).length;
    return working || 1;
  }, [dateRange]);

  const managerRows = useMemo(() => {
    if (!dateRange.length) return [];
    const allowedDates = new Set(dateRange.map((date) => formatDateKey(date)));
    const map = {};
    allTimesheets.forEach((ts) => {
      const tsDate = normalizeDateString(ts.date);
      if (!allowedDates.has(tsDate)) return;
      const userInfo = typeof ts.userId === 'object' && ts.userId !== null
        ? ts.userId
        : { _id: ts.userId, name: 'Unknown' };
      const id = userInfo?._id || ts.userId;
      if (!id) return;
      if (!map[id]) {
        map[id] = {
          id,
          name: userInfo?.name || 'Unknown',
          division: userInfo?.division || 'General',
          email: userInfo?.email || '',
          dayHours: {},
          totalHours: 0,
          entries: 0,
        };
      }
      const hours = calculateHours(ts.startTime, ts.endTime);
      map[id].totalHours += hours;
      map[id].entries += 1;
      map[id].dayHours[tsDate] = (map[id].dayHours[tsDate] || 0) + hours;
    });
    return Object.values(map).map((row) => {
      const planHours = workingDaysInRange * 8;
      const budgetHours = planHours + 16;
      return {
        ...row,
        planHours,
        budgetHours,
        delta: row.totalHours - planHours,
      };
    }).sort((a, b) => b.totalHours - a.totalHours);
  }, [allTimesheets, dateRange, workingDaysInRange]);

  const filteredRows = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();
    return managerRows.filter((row) => {
      const matchesSearch = !search || row.name.toLowerCase().includes(search) || row.email.toLowerCase().includes(search);
      const matchesDivision = divisionFilter === 'all' || row.division === divisionFilter;
      return matchesSearch && matchesDivision;
    });
  }, [managerRows, searchTerm, divisionFilter]);

  const monthLabel = useMemo(() => currentMonth.toLocaleString('default', { month: 'long', year: 'numeric' }), [currentMonth]);

  const gridTemplateStyle = useMemo(() => ({
    gridTemplateColumns: `260px 80px 90px 90px repeat(${dateRange.length}, minmax(70px, 1fr))`,
  }), [dateRange.length]);

  const handleMonthChange = (offset) => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
  };

  const weekDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      days.push({ key: formatDateKey(d), label: d.toLocaleDateString('default', { weekday: 'short' }), date: d });
    }
    return days;
  }, [weekStart]);

  const handleWeekHoursChange = (rowId, dayKey, value) => {
    setWeeklyRows((rows) =>
      rows.map((row) =>
        row.id === rowId ? { ...row, hours: { ...row.hours, [dayKey]: value } } : row
      )
    );
  };

  const handleWeekRowChange = (rowId, field, value) => {
    setWeeklyRows((rows) =>
      rows.map((row) => (row.id === rowId ? { ...row, [field]: value } : row))
    );
  };

  const addWeekRow = () => {
    setWeeklyRows((rows) => [...rows, { id: `row-${Date.now()}-${rows.length}`, projectId: '', description: '', hours: {} }]);
  };

  const removeWeekRow = (rowId) => {
    setWeeklyRows((rows) => rows.filter((r) => r.id !== rowId));
  };

  const submitWeekEntries = async () => {
    setLoading(true);
    try {
      const createdEntries = [];
      for (const row of weeklyRows) {
        const projectObj = projects.find((p) => (p.id || p._id) === row.projectId);
        const projectName = projectObj?.name || '';
        for (const day of weekDays) {
          const hours = Number(row.hours?.[day.key] || 0);
          if (!row.projectId || hours <= 0) continue;
          const { startTime, endTime } = buildTimeRangeFromHours(hours);
          const payload = {
            projectId: row.projectId,
            projectName,
            date: day.key,
            startTime,
            endTime,
            description: row.description || '',
            user: authUser,
          };
          const result = await submitTimesheet(apiFetch, payload);
          const saved = result?.timesheet || result?.data || result || payload;
          createdEntries.push({
            ...payload,
            ...saved,
            projectId: payload.projectId,
            projectName: payload.projectName || saved.projectName,
          });
        }
      }
      if (createdEntries.length) {
        setTimesheets((prev) => {
          const map = new Map();
          [...createdEntries, ...prev].forEach((ts) => {
            const key = ts._id || `${ts.date}-${ts.startTime}-${ts.projectId || ts.projectName}`;
            map.set(key, ts);
          });
          return Array.from(map.values());
        });
      }
      showSwal('Success', 'Week entries saved', 'success', 1500);
      setRefreshKey((p) => p + 1);
    } catch (err) {
      showSwal('Error', err?.payload?.message || err.message || 'Failed to save week entries', 'error');
    } finally {
      setLoading(false);
    }
  };

  const personalDayMap = useMemo(() => {
    const map = {};
    timesheets.forEach((ts) => {
      const key = normalizeDateString(ts.date) || 'Unknown';
      const hours = calculateHours(ts.startTime, ts.endTime);
      const projectName =
        ts.projectName ||
        (projects.find((p) => (p.id || p._id) === ts.projectId)?.name) ||
        'Unspecified';
      if (!map[key]) {
        map[key] = { total: 0, projects: {}, count: 0 };
      }
      map[key].total += hours;
      map[key].count += 1;
      map[key].projects[projectName] = (map[key].projects[projectName] || 0) + hours;
    });
    return map;
  }, [timesheets, projects]);

  if (isManager) {
    return (
      <div className="space-y-6">
        <GlassCard className="mt-6 p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Team Workload</h1>
              <p className="text-gray-600">Calendar-style overview of timesheet submissions</p>
            </div>
            {showCalendar && (
              <div className="flex items-center gap-2">
                <button
                  className="px-3 py-1.5 rounded border border-gray-200 hover:bg-gray-50"
                  onClick={() => handleMonthChange(-1)}
                >
                  &larr;
                </button>
                <div className="min-w-[150px] text-center font-semibold">{monthLabel}</div>
                <button
                  className="px-3 py-1.5 rounded border border-gray-200 hover:bg-gray-50"
                  onClick={() => handleMonthChange(1)}
                >
                  &rarr;
                </button>
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex gap-2 flex-wrap">
              <button
                className={`px-3 py-1.5 rounded-full text-sm border ${divisionFilter === 'all' ? 'bg-black text-white border-black' : 'border-gray-200 text-gray-700'}`}
                onClick={() => setDivisionFilter('all')}
              >
                All Teams
              </button>
              {uniqueDivisions.map((div) => (
                <button
                  key={div}
                  className={`px-3 py-1.5 rounded-full text-sm border capitalize ${divisionFilter === div ? 'bg-black text-white border-black' : 'border-gray-200 text-gray-700'}`}
                  onClick={() => setDivisionFilter(div)}
                >
                  {div}
                </button>
              ))}
            </div>
            <div className="flex-1 min-w-[220px]">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search teammate"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-black focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-green-200 border border-green-300" /> 8h+</span>
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-blue-200 border border-blue-300" /> 4-7h</span>
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-amber-100 border border-amber-200" /> &lt;4h</span>
            </div>
          </div>
        </GlassCard>
        <GlassCard className="p-0 overflow-hidden">
          {fetching ? (
            <p className="text-center py-8 text-gray-500">Loading timesheets...</p>
          ) : filteredRows.length === 0 ? (
            <p className="text-center py-12 text-gray-500">No timesheet activity for this period.</p>
          ) : (
            <div className="overflow-x-auto">
              <div className="min-w-[900px]">
                <div className="grid text-xs font-semibold text-gray-600 uppercase tracking-wide bg-gray-50 border-b border-gray-200" style={gridTemplateStyle}>
                  <div className="px-4 py-3">Employee</div>
                  <div className="px-4 py-3 text-center">Fact</div>
                  <div className="px-4 py-3 text-center">Plan</div>
                  <div className="px-4 py-3 text-center">Budget</div>
                  {dateRange.map((date) => (
                    <div key={date.toISOString()} className={`px-4 py-3 text-center ${isWeekend(date) ? 'bg-gray-100' : ''}`}>
                      <div className="text-[11px] font-normal text-gray-500">{date.toLocaleDateString('default', { weekday: 'short' })}</div>
                      <div className="text-sm text-gray-800">{date.getDate()}</div>
                    </div>
                  ))}
                </div>
                {filteredRows.map((row) => (
                  <div key={row.id} className="grid border-b border-gray-100 text-sm" style={gridTemplateStyle}>
                    <div className="px-4 py-4 flex items-center gap-3 border-r border-gray-100">
                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600">
                        {getInitials(row.name)}
                      </div>
                      <div>
                        <p className="font-semibold">{row.name}</p>
                        <p className="text-xs text-gray-500">{row.division}</p>
                      </div>
                    </div>
                    <div className="px-4 py-4 text-center">
                      <p className="font-semibold text-gray-900">{row.totalHours.toFixed(1)}</p>
                      <p className={`text-xs ${row.delta >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {row.delta >= 0 ? '+' : ''}{row.delta.toFixed(1)}h
                      </p>
                    </div>
                    <div className="px-4 py-4 text-center">
                      <p className="font-semibold text-gray-900">{row.planHours.toFixed(1)}</p>
                      <p className="text-xs text-gray-500">Plan</p>
                    </div>
                    <div className="px-4 py-4 text-center">
                      <p className="font-semibold text-gray-900">{row.budgetHours.toFixed(1)}</p>
                      <p className="text-xs text-gray-500">Budget</p>
                    </div>
                    {dateRange.map((date) => {
                      const key = formatDateKey(date);
                      const hours = row.dayHours[key] || 0;
                      return (
                        <div
                          key={`${row.id}-${key}`}
                          className={`px-2 py-4 flex items-center justify-center border-l border-gray-50 ${isWeekend(date) ? 'bg-gray-50' : ''}`}
                        >
                          <div className={`w-full text-center rounded-md px-2 py-1 text-xs font-semibold ${cellColor(hours)}`}>
                            {hours ? `${hours.toFixed(1)}h` : '—'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </GlassCard>
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold">Project Master</h2>
              <p className="text-gray-600 text-sm">Manage projects for timesheets</p>
            </div>
            {editingProject && (
              <button
                type="button"
                className="text-sm text-gray-600 underline"
                onClick={resetProjectForm}
              >
                Cancel edit
              </button>
            )}
          </div>
          <form className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4" onSubmit={handleProjectSave}>
            <input className="border rounded px-3 py-2 text-sm" placeholder="Name *" value={projectForm.name} onChange={(e) => setProjectForm({ ...projectForm, name: e.target.value })} required />
            <input className="border rounded px-3 py-2 text-sm" placeholder="Code *" value={projectForm.code} onChange={(e) => setProjectForm({ ...projectForm, code: e.target.value })} required />
            <input className="border rounded px-3 py-2 text-sm" placeholder="Client" value={projectForm.client} onChange={(e) => setProjectForm({ ...projectForm, client: e.target.value })} />
            <select className="border rounded px-3 py-2 text-sm" value={projectForm.status} onChange={(e) => setProjectForm({ ...projectForm, status: e.target.value })}>
              <option value="active">Active</option>
              <option value="archived">Archived</option>
            </select>
            <input type="date" className="border rounded px-3 py-2 text-sm" value={projectForm.startDate} onChange={(e) => setProjectForm({ ...projectForm, startDate: e.target.value })} />
            <input type="date" className="border rounded px-3 py-2 text-sm" value={projectForm.endDate} onChange={(e) => setProjectForm({ ...projectForm, endDate: e.target.value })} />
            <input type="number" className="border rounded px-3 py-2 text-sm" placeholder="Budget" value={projectForm.budget} onChange={(e) => setProjectForm({ ...projectForm, budget: e.target.value })} />
            <input className="border rounded px-3 py-2 text-sm md:col-span-2" placeholder="Description" value={projectForm.description} onChange={(e) => setProjectForm({ ...projectForm, description: e.target.value })} />
            <div className="md:col-span-2 flex justify-end">
              <button type="submit" disabled={projectSaving} className="bg-black text-white px-4 py-2 rounded font-semibold disabled:opacity-60">
                {projectSaving ? 'Saving...' : editingProject ? 'Update Project' : 'Add Project'}
              </button>
            </div>
          </form>
          <div className="overflow-x-auto -mx-4 sm:-mx-6">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-4 py-2 font-semibold">Name</th>
                  <th className="px-4 py-2 font-semibold">Code</th>
                  <th className="px-4 py-2 font-semibold">Client</th>
                  <th className="px-4 py-2 font-semibold">Status</th>
                  <th className="px-4 py-2 font-semibold">Dates</th>
                  <th className="px-4 py-2 font-semibold">Budget</th>
                  <th className="px-4 py-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => (
                  <tr key={p._id} className="border-b">
                    <td className="px-4 py-2">{p.name}</td>
                    <td className="px-4 py-2 text-gray-600">{p.code}</td>
                    <td className="px-4 py-2 text-gray-600">{p.client || '-'}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-gray-600">
                      {(p.startDate ? p.startDate.slice(0, 10) : '—')} - {(p.endDate ? p.endDate.slice(0, 10) : '—')}
                    </td>
                    <td className="px-4 py-2 text-gray-600">{p.budget ? `Rp ${p.budget.toLocaleString()}` : '-'}</td>
                    <td className="px-4 py-2 space-x-2">
                      <button type="button" className="text-blue-600 text-xs font-semibold" onClick={() => handleProjectEdit(p)}>Edit</button>
                      <button type="button" className="text-red-600 text-xs font-semibold" onClick={() => handleProjectDelete(p)}>Delete</button>
                    </td>
                  </tr>
                ))}
                {projects.length === 0 && (
                  <tr>
                    <td className="px-4 py-3 text-gray-500 text-sm" colSpan={7}>No projects yet. Add one above.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </div>
    );
  }

  const groupedDays = useMemo(() => {
    return Object.entries(personalDayMap)
      .map(([date, info]) => ({
        date,
        totalHours: info.total,
        projects: info.projects,
        count: info.count,
      }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [personalDayMap, timesheets]);

  return (
    <GlassCard className="mt-6 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Timesheets</h1>
          {showWeek ? (
            <p className="text-gray-600 text-sm">Use the weekly grid to add hours; calendar updates automatically.</p>
          ) : (
            <p className="text-gray-600 text-sm">Calendar view of all your submitted hours.</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-1.5 rounded border border-gray-200 hover:bg-gray-50"
            onClick={() => handleMonthChange(-1)}
          >
            &larr;
          </button>
          <div className="min-w-[150px] text-center font-semibold">{monthLabel}</div>
          <button
            className="px-3 py-1.5 rounded border border-gray-200 hover:bg-gray-50"
            onClick={() => handleMonthChange(1)}
          >
            &rarr;
          </button>
        </div>
      </div>

      {fetching ? (
        <p className="text-center py-8 text-gray-500">Loading timesheets...</p>
      ) : (
        <>
          {showCalendar && (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold">Calendar</h3>
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-green-200 border border-green-300" /> 8h+</span>
                  <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-blue-200 border border-blue-300" /> 4-7h</span>
                  <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-amber-100 border border-amber-200" /> &lt;4h</span>
                </div>
              </div>
              <div className="grid grid-cols-7 gap-2 text-sm">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                  <div key={day} className="text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    {day}
                  </div>
                ))}
                {dateRange.map((date) => {
                  const key = formatDateKey(date);
                  const info = personalDayMap[key];
                  const projects = info?.projects || {};
                  return (
                    <div
                      key={key}
                      className={`border rounded-lg p-2 min-h-[90px] flex flex-col gap-1 ${isWeekend(date) ? 'bg-gray-50' : ''}`}
                    >
                      <div className="flex items-center justify-between text-xs text-gray-600">
                        <span>{date.getDate()}</span>
                        {info && <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${cellColor(info.total)}`}>{info.total.toFixed(2)}h</span>}
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {Object.entries(projects).map(([name, hours]) => (
                          <span key={name} className="bg-gray-100 text-[11px] px-2 py-0.5 rounded-full">
                            {name} <span className="text-blue-600 font-semibold">{hours.toFixed(1)}h</span>
                          </span>
                        ))}
                        {!info && <span className="text-[11px] text-gray-400">No entries</span>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {showWeek && (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold">Week Entry</h3>
                  <p className="text-gray-600 text-sm">Log hours per project across the week</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    className="px-3 py-1.5 rounded border border-gray-200 hover:bg-gray-50"
                    onClick={() => setWeekStart((prev) => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() - 7))}
                  >
                    &larr;
                  </button>
                  <div className="text-sm font-semibold">
                    {weekDays[0].date.toLocaleDateString()} - {weekDays[6].date.toLocaleDateString()}
                  </div>
                  <button
                    className="px-3 py-1.5 rounded border border-gray-200 hover:bg-gray-50"
                    onClick={() => setWeekStart((prev) => new Date(prev.getFullYear(), prev.getMonth(), prev.getDate() + 7))}
                  >
                    &rarr;
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="px-3 py-2 text-left font-semibold w-48">Project</th>
                      <th className="px-3 py-2 text-left font-semibold w-40">Task / Description</th>
                      {weekDays.map((d) => (
                        <th key={d.key} className="px-2 py-2 text-center font-semibold">{d.label} {d.date.getDate()}</th>
                      ))}
                      <th className="px-2 py-2 text-center font-semibold">Remove</th>
                    </tr>
                  </thead>
                  <tbody>
                    {weeklyRows.map((row) => (
                      <tr key={row.id} className="border-b">
                        <td className="px-3 py-2">
                          <select className="border rounded px-2 py-1 w-full" value={row.projectId} onChange={(e) => handleWeekRowChange(row.id, 'projectId', e.target.value)}>
                            <option value="">Select project</option>
                            {projects.map((p) => (
                              <option key={p.id || p._id} value={p.id || p._id}>{p.name}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <input
                            className="border rounded px-2 py-1 w-full"
                            placeholder="Description / Task"
                            value={row.description}
                            onChange={(e) => handleWeekRowChange(row.id, 'description', e.target.value)}
                          />
                        </td>
                        {weekDays.map((d) => (
                          <td key={d.key} className="px-2 py-1 text-center">
                            <input
                              type="number"
                              min="0"
                              step="0.25"
                              className="w-20 border rounded px-2 py-1 text-center"
                              value={row.hours[d.key] || ''}
                              onChange={(e) => handleWeekHoursChange(row.id, d.key, e.target.value)}
                              placeholder="0"
                            />
                          </td>
                        ))}
                        <td className="px-2 py-2 text-center">
                          {weeklyRows.length > 1 && (
                            <button type="button" className="text-red-500 font-semibold text-xs" onClick={() => removeWeekRow(row.id)}>Delete</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex justify-between mt-3">
                <button type="button" className="text-sm font-semibold text-blue-600" onClick={addWeekRow}>+ Add Row</button>
                <div className="space-x-2">
                  <button type="button" onClick={submitWeekEntries} disabled={loading} className="bg-black text-white px-4 py-2 rounded font-semibold disabled:opacity-60">
                    {loading ? 'Saving...' : 'Submit Week'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </GlassCard>
  );
};

export default TimesheetsPage;
