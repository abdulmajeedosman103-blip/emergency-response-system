// frontend/src/config/index.js
// Backend API base URL comes from the VITE_ environment convention.
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const API_BASE_URL = `${API_URL}/api`;