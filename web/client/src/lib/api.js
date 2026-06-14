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
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || payload.message || '요청 처리 중 오류가 발생했습니다.');
  }
  return payload;
};
