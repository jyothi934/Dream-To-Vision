import { supabase } from './supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Gets the current user's JWT token for backend authorization.
 */
async function getAuthHeader() {
  const { data } = await supabase.auth.getSession();
  const token = data?.session?.access_token;
  if (!token) throw new Error('Not authenticated');
  return { Authorization: `Bearer ${token}` };
}

/**
 * Generic fetch wrapper with auth, error handling, and JSON parsing.
 */
async function apiFetch(path, options = {}) {
  const authHeader = await getAuthHeader();

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
      ...options.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Request failed with status ${response.status}`);
  }

  return data;
}

// ── Dreams ─────────────────────────────────────────────────

export async function createDream(rawInput, inputType = 'text') {
  return apiFetch('/api/dreams', {
    method: 'POST',
    body: JSON.stringify({ raw_input: rawInput, input_type: inputType }),
  });
}

export async function analyzeDream(dreamId) {
  return apiFetch(`/api/dreams/${dreamId}/analyze`, { method: 'POST' });
}

export async function getDreams() {
  return apiFetch('/api/dreams');
}

export async function getDream(dreamId) {
  return apiFetch(`/api/dreams/${dreamId}`);
}

export async function deleteDream(dreamId) {
  return apiFetch(`/api/dreams/${dreamId}`, { method: 'DELETE' });
}

export async function checkHealth() {
  const response = await fetch(`${API_URL}/api/health`);
  return response.json();
}
