// frontend/src/utils/roleHome.js
export function homeForRole(role) {
  if (role === 'OPERATOR') {
    return '/operator';
  }
  if (role === 'RESPONDER') {
    return '/responder';
  }
  return '/dashboard';
}

export function canRoleAccessPath(role, path) {
  if (!path) {
    return false;
  }
  if (role === 'OPERATOR') {
    return path.startsWith('/operator');
  }
  if (role === 'RESPONDER') {
    return path.startsWith('/responder');
  }
  return true;
}