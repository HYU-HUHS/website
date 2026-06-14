const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';
const SESSION_KEY = 'huhsweb.session';

export const getStoredSession = () => {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
};

export const getAuthHeaders = () => {
  const token = getStoredSession()?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const apiRequest = async (path, options = {}) => {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders(), ...(options.headers || {}) },
    ...options,
  });
  const rawBody = await response.text();
  let payload = {};
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    payload = {};
  }
  if (!response.ok) {
    const fallback = rawBody ? rawBody.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 160) : '';
    throw new Error(payload.error || payload.message || fallback || `요청 처리 중 오류가 발생했습니다. (${response.status})`);
  }
  return payload;
};
