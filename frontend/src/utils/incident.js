// frontend/src/utils/incident.js
export const EMERGENCY_TYPE_LABELS = {
  MEDICAL: 'Medical',
  FIRE: 'Fire',
  ROAD_ACCIDENT: 'Road accident',
  CRIME: 'Crime',
  NATURAL_DISASTER: 'Natural disaster',
  OTHER: 'Other',
};

export const EMERGENCY_PRIORITY_LABELS = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical',
};

export const EMERGENCY_TYPES = Object.keys(EMERGENCY_TYPE_LABELS);

export const EMERGENCY_PRIORITIES = Object.keys(EMERGENCY_PRIORITY_LABELS);

export function formatDate(iso) {
  if (!iso) {
    return '—';
  }
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function formatNotificationDate(iso) {
  if (!iso) {
    return '—';
  }
  return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

export function formatCoordinates(lat, lng) {
  return `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;
}