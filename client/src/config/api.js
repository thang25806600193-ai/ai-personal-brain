export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
export const API_URL = `${API_BASE_URL}/api`;

export const toAbsoluteUrl = (path) => {
  if (!path) return path;
  return path.startsWith('http')
    ? path
    : `${API_BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
};

export const uploadsUrl = (filename) => `${API_BASE_URL}/uploads/${filename}`;
