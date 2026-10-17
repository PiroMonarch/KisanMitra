export const resolveApiBase = () => {
  if (import.meta.env.PROD && typeof window !== 'undefined') {
    return window.location.origin;
  }

  const envBase = import.meta.env.VITE_API_URL;
  if (envBase) return envBase.replace(/\/$/, '');

  if (typeof window !== 'undefined') {
    const { hostname, port, protocol } = window.location;
    if (import.meta.env.DEV) {
      return `${protocol}//${hostname}:5001`;
    }
    return window.location.origin;
  }

  return 'http://localhost:5001';
};

export const API_BASE = resolveApiBase();

export const getAuthHeaders = () => {
  const token = localStorage.getItem('kisanmitr_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};
