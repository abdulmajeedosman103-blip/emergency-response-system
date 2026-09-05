// frontend/src/components/HomeRedirect.jsx
// Sends logged-in users to their role's starting page.
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/authContext';
import { homeForRole } from '../utils/roleHome';

export default function HomeRedirect() {
  const { user, initializing } = useAuth();
  if (initializing) {
    return null;
  }
  return <Navigate to={homeForRole(user?.role)} replace />;
}