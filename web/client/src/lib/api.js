const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export const apiRequest = async (path, options = {}) => {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || payload.message || '요청 처리 중 오류가 발생했습니다.');
  }
  return payload;
};
