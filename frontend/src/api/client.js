// src/api/client.js
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

function getToken() {
  try {
    const raw = localStorage.getItem('sentinel_auth');
    return raw ? JSON.parse(raw)?.token || null : null;
  } catch {
    return null;
  }
}

export async function apiRequest(path, init = {}) {
  const url = path.startsWith('http') ? path : `${BASE_URL}${path}`;
  const token = getToken();
  const method = init.method || 'GET';

  const headers = {
    Accept: 'application/json',
    ...(typeof init.body === 'string' ? { 'Content-Type': 'application/json' } : {}),
    ...(init.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };

  const res = await fetch(url, { ...init, method, headers });

  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }

  if (!res.ok) {
    const err = new Error(data?.error || data?.message || `HTTP ${res.status}`);
    err.status = res.status;
    err.details = data?.details;
    throw err;
  }

  return data;
}
