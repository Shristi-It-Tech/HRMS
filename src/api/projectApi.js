export const fetchProjects = async (apiFetch) => {
  const response = await apiFetch('/api/projects');
  return Array.isArray(response) ? response : response.data || [];
};

export const createProject = async (apiFetch, payload) => {
  const response = await apiFetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return response.project || response;
};

export const updateProject = async (apiFetch, id, payload) => {
  const response = await apiFetch(`/api/projects/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return response.project || response;
};

export const deleteProject = async (apiFetch, id) => {
  return apiFetch(`/api/projects/${id}`, { method: 'DELETE' });
};
