import React, { useEffect, useState } from 'react';
import { GlassCard } from '../UI/Cards';
import { useAuth } from '../../hooks/useAuth';
import { fetchProjects, createProject, updateProject, deleteProject } from '../../api/projectApi';
import { showSwal } from '../../utils/swal';

const emptyForm = {
  name: '',
  code: '',
  client: '',
  status: 'active',
  startDate: '',
  endDate: '',
  budget: '',
  description: '',
};

const ProjectAdmin = () => {
  const { apiFetch } = useAuth();
  const [projects, setProjects] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editing, setEditing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const list = await fetchProjects(apiFetch);
      setProjects(list || []);
    } catch (err) {
      showSwal('Error', err?.payload?.message || err.message || 'Failed to fetch projects', 'error');
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (apiFetch) loadProjects();
  }, [apiFetch]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name || !form.code) {
      showSwal('Error', 'Project name and code are required', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        budget: form.budget ? Number(form.budget) : 0,
      };
      if (editing?._id) {
        await updateProject(apiFetch, editing._id, payload);
        showSwal('Success', 'Project updated', 'success', 1200);
      } else {
        await createProject(apiFetch, payload);
        showSwal('Success', 'Project created', 'success', 1200);
      }
      setForm(emptyForm);
      setEditing(null);
      await loadProjects();
    } catch (err) {
      showSwal('Error', err?.payload?.message || err.message || 'Failed to save project', 'error');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (proj) => {
    setEditing(proj);
    setForm({
      name: proj.name || '',
      code: proj.code || '',
      client: proj.client || '',
      status: proj.status || 'active',
      startDate: proj.startDate ? proj.startDate.slice(0, 10) : '',
      endDate: proj.endDate ? proj.endDate.slice(0, 10) : '',
      budget: proj.budget || '',
      description: proj.description || '',
    });
  };

  const handleDelete = async (proj) => {
    try {
      await deleteProject(apiFetch, proj._id);
      if (editing?._id === proj._id) {
        setEditing(null);
        setForm(emptyForm);
      }
      await loadProjects();
      showSwal('Deleted', 'Project removed', 'success', 1200);
    } catch (err) {
      showSwal('Error', err?.payload?.message || err.message || 'Failed to delete project', 'error');
    }
  };

  return (
    <GlassCard className="mt-6 p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">Projects</h2>
          <p className="text-gray-600 text-sm">Manage master projects for timesheets</p>
        </div>
        {editing && (
          <button
            type="button"
            className="text-sm text-gray-600 underline"
            onClick={() => {
              setEditing(null);
              setForm(emptyForm);
            }}
          >
            Cancel edit
          </button>
        )}
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input className="border rounded px-3 py-2 text-sm" placeholder="Name *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input className="border rounded px-3 py-2 text-sm" placeholder="Code *" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
        <input className="border rounded px-3 py-2 text-sm" placeholder="Client" value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} />
        <select className="border rounded px-3 py-2 text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          <option value="active">Active</option>
          <option value="archived">Archived</option>
        </select>
        <input type="date" className="border rounded px-3 py-2 text-sm" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
        <input type="date" className="border rounded px-3 py-2 text-sm" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
        <input type="number" className="border rounded px-3 py-2 text-sm" placeholder="Budget" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
        <input className="border rounded px-3 py-2 text-sm md:col-span-2" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        <div className="md:col-span-2 flex justify-end">
          <button type="submit" disabled={saving} className="bg-black text-white px-4 py-2 rounded font-semibold disabled:opacity-60">
            {saving ? 'Saving...' : editing ? 'Update Project' : 'Add Project'}
          </button>
        </div>
      </form>

      <div className="overflow-x-auto -mx-4 sm:-mx-6">
        {loading ? (
          <p className="text-center py-6 text-gray-500">Loading projects...</p>
        ) : (
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
                    <button type="button" className="text-blue-600 text-xs font-semibold" onClick={() => startEdit(p)}>Edit</button>
                    <button type="button" className="text-red-600 text-xs font-semibold" onClick={() => handleDelete(p)}>Delete</button>
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
        )}
      </div>
    </GlassCard>
  );
};

export default ProjectAdmin;
