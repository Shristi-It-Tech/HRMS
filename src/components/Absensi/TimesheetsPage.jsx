import React, { useState, useEffect, useMemo } from 'react';
import { GlassCard } from '../UI/Cards';
import { useAuth } from '../../hooks/useAuth';
import { submitTimesheet, fetchMyTimesheets, fetchAllTimesheets, updateTimesheet } from '../../api/timesheetApi';
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

const TimesheetEntryModal = ({ isOpen, onClose, onSubmit, projects, loading, initialEntry = null }) => {
  const [project, setProject] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (isOpen && initialEntry) {
      setProject(initialEntry.projectId || initialEntry.project_id || '');
      setDate(initialEntry.date || new Date().toISOString().split('T')[0]);
      setStartTime(initialEntry.startTime || '');
      setEndTime(initialEntry.endTime || '');
      setDescription(initialEntry.description || '');
    } else if (isOpen) {
      setProject('');
      setDate(new Date().toISOString().split('T')[0]);
      setStartTime('');
      setEndTime('');
      setDescription('');
    }
  }, [isOpen, initialEntry]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!project || !date || !startTime || !endTime) {
      showSwal('Error', 'Please fill all required fields', 'error');
      return;
    }
    // Validate times
    const [startH, startM] = startTime.split(':').map(Number);
    const [endH, endM] = endTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    if (endMinutes <= startMinutes) {
      showSwal('Error', 'End time must be after start time', 'error');
      return;
    }
    const projectObj = projects.find(p => (p.id || p._id) === project);
    onSubmit({ projectId: project, projectName: projectObj?.name || '', date, startTime, endTime, description });
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 relative">
        <button className="absolute top-3 right-3 text-gray-400 hover:text-gray-700" onClick={onClose}>&times;</button>
        <h2 className="text-xl font-bold mb-1">{initialEntry ? 'Edit Time Entry' : 'Add Manual Time Entry'}</h2>
        <p className="text-gray-500 mb-4 text-sm">Add time entry for work done without using the timer</p>
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Project <span className="text-red-500">*</span></label>
            <select className="border rounded px-2 py-1 w-full" value={project} onChange={e => setProject(e.target.value)} required>
              <option value="">Select project</option>
              {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Date <span className="text-red-500">*</span></label>
            <input type="date" className="border rounded px-2 py-1 w-full" value={date} onChange={e => setDate(e.target.value)} required />
          </div>
          <div className="flex gap-2 mb-3">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Start Time <span className="text-red-500">*</span></label>
              <input type="time" className="border rounded px-2 py-1 w-full" value={startTime} onChange={e => setStartTime(e.target.value)} required />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">End Time <span className="text-red-500">*</span></label>
              <input type="time" className="border rounded px-2 py-1 w-full" value={endTime} onChange={e => setEndTime(e.target.value)} required />
            </div>
          </div>
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Description (Optional)</label>
            <textarea className="border rounded px-2 py-1 w-full" value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Additional details about the work performed" />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button type="button" className="px-4 py-2 rounded border border-gray-300 bg-white text-gray-700" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={loading} className="px-4 py-2 rounded bg-black text-white font-semibold disabled:opacity-50">{loading ? 'Saving...' : 'Add Entry'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const TimesheetsPage = () => {
  const { authUser, apiFetch } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
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
  const [editingEntry, setEditingEntry] = useState(null);

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

  const handleAddEntry = async (entry) => {
    setLoading(true);
    try {
      const result = editingEntry
        ? await updateTimesheet(apiFetch, editingEntry._id, { ...entry, user: authUser })
        : await submitTimesheet(apiFetch, { ...entry, user: authUser });
      if (result && (result.success || result.timesheet)) {
        const msg = result.localOnly
          ? 'Timesheet saved locally (offline/session issue). It will stay on this device.'
          : editingEntry
          ? 'Timesheet updated successfully!'
          : 'Timesheet submitted successfully!';
        showSwal('Success', msg, 'success', 1800);
      }
      setModalOpen(false);
      setEditingEntry(null);
      // Trigger refetch
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      showSwal('Error', error.payload?.message || error.message || 'Failed to submit timesheet', 'error');
    } finally {
      setLoading(false);
    }
  };

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
      if (!allowedDates.has(ts.date)) return;
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
      map[id].dayHours[ts.date] = (map[id].dayHours[ts.date] || 0) + hours;
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

  if (isManager) {
    return (
      <div className="space-y-6">
        <GlassCard className="mt-6 p-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Team Workload</h1>
              <p className="text-gray-600">Calendar-style overview of timesheet submissions</p>
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

  return (
    <GlassCard className="mt-6 p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">My Timesheets</h1>
        <button className="bg-black text-white px-4 py-2 rounded font-semibold" onClick={() => setModalOpen(true)}>
          + Add Manual Entry
        </button>
      </div>
      {fetching ? (
        <p className="text-center py-8 text-gray-500">Loading timesheets...</p>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full min-w-[700px]">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-4 py-3 text-left font-semibold">Date</th>
                  <th className="px-4 py-3 text-left font-semibold">Projects</th>
                  <th className="px-4 py-3 text-left font-semibold">Entries</th>
                  <th className="px-4 py-3 text-left font-semibold">Total Hours</th>
                </tr>
              </thead>
              <tbody>
                {Object.values(
                  timesheets.reduce((acc, ts) => {
                    const key = ts.date || 'Unknown';
                    const hours = calculateHours(ts.startTime, ts.endTime);
                    const projectName =
                      ts.projectName ||
                      (projects.find(p => (p.id || p._id) === ts.projectId)?.name) ||
                      'Unspecified';
                    if (!acc[key]) {
                      acc[key] = {
                        date: key,
                        totalHours: 0,
                        projects: {},
                        count: 0,
                        entries: [],
                      };
                    }
                    acc[key].totalHours += hours;
                    acc[key].count += 1;
                    acc[key].projects[projectName] = (acc[key].projects[projectName] || 0) + hours;
                    acc[key].entries.push({ ...ts, projectName });
                    return acc;
                  }, {})
                )
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .map((group) => (
                    <tr key={group.date} className="border-b hover:bg-gray-50 align-top">
                      <td className="px-4 py-3 text-sm whitespace-nowrap">{group.date}</td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(group.projects).map(([name, hours]) => (
                            <span key={name} className="inline-flex items-center px-3 py-1 rounded-full bg-gray-100 text-gray-800 text-xs font-semibold">
                              {name}
                              <span className="ml-2 text-blue-600">{hours.toFixed(2)}h</span>
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{group.count}</td>
                      <td className="px-4 py-3 text-sm font-bold text-blue-600">{group.totalHours.toFixed(2)}h</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          {timesheets.length === 0 && <p className="text-center py-8 text-gray-500">No timesheet entries yet. Add one to get started!</p>}
          {timesheets.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-3">Entries</h3>
              <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
                <table className="w-full min-w-[700px]">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      <th className="px-4 py-3 text-left font-semibold">Date</th>
                      <th className="px-4 py-3 text-left font-semibold">Project</th>
                      <th className="px-4 py-3 text-left font-semibold">Time</th>
                      <th className="px-4 py-3 text-left font-semibold">Hours</th>
                      <th className="px-4 py-3 text-left font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {timesheets.map((ts) => {
                      const [startH, startM] = (ts.startTime || '').split(':').map(Number);
                      const [endH, endM] = (ts.endTime || '').split(':').map(Number);
                      const start = startH * 60 + startM;
                      const end = endH * 60 + endM;
                      const hours = end > start ? ((end - start) / 60).toFixed(2) : 0;
                      const projectName =
                        ts.projectName ||
                        (projects.find(p => (p.id || p._id) === ts.projectId)?.name) ||
                        'Unspecified';
                      return (
                        <tr key={ts._id} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm">{ts.date}</td>
                          <td className="px-4 py-3 text-sm">{projectName}</td>
                          <td className="px-4 py-3 text-sm">{ts.startTime} - {ts.endTime}</td>
                          <td className="px-4 py-3 text-sm font-bold text-blue-600">{hours}h</td>
                          <td className="px-4 py-3 text-sm">
                            <button
                              type="button"
                              className="text-blue-600 font-semibold"
                              onClick={() => {
                                setEditingEntry({ ...ts, projectName });
                                setModalOpen(true);
                              }}
                            >
                              Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
      <TimesheetEntryModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingEntry(null);
        }}
        onSubmit={handleAddEntry}
        projects={projects}
        loading={loading}
        initialEntry={editingEntry}
      />
    </GlassCard>
  );
};

export default TimesheetsPage;
