// frontend/src/api/client.js
// Centralized API client — handles JSON, JWT attachment, and error parsing.
import { API_BASE_URL } from '../config';

const TOKEN_KEY = 'emergency_response_token';

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function attachAuthHeader(headers, auth) {
  if (auth) {
    const token = getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }
}

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  attachAuthHeader(headers, auth);

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(data?.error?.message || 'Something went wrong.');
    error.status = response.status;
    error.code = data?.error?.code;
    throw error;
  }

  return data;
}

function buildQuery(params) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  });
  const qs = searchParams.toString();
  return qs ? `?${qs}` : '';
}

export const api = {
  register: (payload) => request('/auth/register', { method: 'POST', body: payload, auth: false }),
  login: (payload) => request('/auth/login', { method: 'POST', body: payload, auth: false }),
  me: () => request('/auth/me'),
  createIncident: (payload) => request('/incidents', { method: 'POST', body: payload }),
  myIncidents: () => request('/incidents/my'),
  incident: (id) => request(`/incidents/${encodeURIComponent(id)}`),
  sendSos: (payload) => request('/incidents/sos', { method: 'POST', body: payload }),
  operatorIncidents: (filters = {}) => request(`/operator/incidents${buildQuery(filters)}`),
  operatorIncident: (id) => request(`/operator/incidents/${encodeURIComponent(id)}`),
  verifyIncident: (id) => request(`/operator/incidents/${encodeURIComponent(id)}/verify`, { method: 'PATCH' }),
  resolveIncident: (id) => request(`/operator/incidents/${encodeURIComponent(id)}/resolve`, { method: 'PATCH' }),
  cancelIncident: (id) => request(`/operator/incidents/${encodeURIComponent(id)}/cancel`, { method: 'PATCH' }),
  operatorResponders: (filters = {}) => request(`/operator/responders${buildQuery(filters)}`),
  assignResponder: (incidentId, responderId) =>
    request(`/operator/incidents/${encodeURIComponent(incidentId)}/assign`, {
      method: 'POST',
      body: { responderId },
    }),
  responderMe: () => request('/responder/me'),
  myAssignments: (filters = {}) => request(`/responder/assignments${buildQuery(filters)}`),
  assignment: (id) => request(`/responder/assignments/${encodeURIComponent(id)}`),
  acceptAssignment: (id) => request(`/responder/assignments/${encodeURIComponent(id)}/accept`, { method: 'PATCH' }),
  enRouteAssignment: (id) =>
    request(`/responder/assignments/${encodeURIComponent(id)}/en-route`, { method: 'PATCH' }),
  arriveAssignment: (id) =>
    request(`/responder/assignments/${encodeURIComponent(id)}/arrive`, { method: 'PATCH' }),
  completeAssignment: (id) =>
    request(`/responder/assignments/${encodeURIComponent(id)}/complete`, { method: 'PATCH' }),
  updateAvailability: (availability) =>
    request('/responder/availability', { method: 'PATCH', body: { availability } }),
  notifications: (params = {}) => request(`/notifications${buildQuery(params)}`),
  markNotificationRead: (id) => request(`/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' }),
  markNotificationsReadAll: () => request('/notifications/read-all', { method: 'PATCH' }),
  auditLogs: (params = {}) => request(`/operator/audit-logs${buildQuery(params)}`),
  auditMeta: () => request('/operator/audit-logs/meta'),
  incidentAi: (id) => request(`/operator/incidents/${encodeURIComponent(id)}/ai`),
  reSuggestIncident: (id) =>
    request(`/operator/incidents/${encodeURIComponent(id)}/ai/re-suggest`, { method: 'POST' }),
  acceptAiSuggestion: (id) =>
    request(`/operator/incidents/${encodeURIComponent(id)}/ai/accept`, { method: 'PATCH' }),
  overrideAiSuggestion: (id, data) =>
    request(`/operator/incidents/${encodeURIComponent(id)}/ai/override`, { method: 'PATCH', body: data }),
  aiStats: (params = {}) => request(`/operator/ai/stats${buildQuery(params)}`),
  aiMeta: () => request('/operator/ai/meta'),
};