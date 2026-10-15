// Calls to the editor's endpoints (api/crm/*). Each resolves to the JSON body,
// or throws an Error carrying the server's message and status.
async function call(path, { method = 'GET', body } = {}) {
  const response = await fetch(`/api/crm/${path}`, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || `Request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return data;
}

export const getSession = () => call('session');
export const signIn = (password) => call('session', { method: 'POST', body: { password } });
export const signOut = () => call('session', { method: 'DELETE' });

export const loadContent = () => call('content');
export const loadRevision = (id) => call(`content?revision=${encodeURIComponent(id)}`);
export const loadHistory = () => call('content?history=1');
export const saveContent = (data, baseRevision, note) => call('content', { method: 'PUT', body: { data, baseRevision, note } });

export const requestUploads = (files) => call('upload', { method: 'POST', body: { files } });
