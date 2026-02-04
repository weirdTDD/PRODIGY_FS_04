const API_BASE = import.meta.env.VITE_API_URL || '';

const request = async (path, { method = 'GET', body, token } = {}) => {
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = data?.error || 'Request failed';
    throw new Error(message);
  }

  return data;
};

export const api = {
  login: (payload) => request('/api/auth/login', { method: 'POST', body: payload }),
  register: (payload) =>
    request('/api/auth/register', { method: 'POST', body: payload }),
  getRooms: () => request('/api/rooms'),
  createRoom: (payload, token) =>
    request('/api/rooms', { method: 'POST', body: payload, token }),
  joinRoom: (roomId, token) =>
    request(`/api/rooms/${roomId}/join`, { method: 'POST', token }),
  getJoinedRooms: (token) =>
    request('/api/rooms/joined', { method: 'GET', token }),
};
