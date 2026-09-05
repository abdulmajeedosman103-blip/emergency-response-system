// frontend/src/components/Layout.jsx
// Application shell — header, main content, footer.
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/authContext';
import NotificationBell from './NotificationBell';
import SosButton from './SosButton';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="text-lg font-semibold text-slate-800">
            Emergency Response System
          </Link>
          <nav className="flex items-center gap-3 text-sm">
            {user ? (
              <>
                {user.role === 'OPERATOR' && (
                  <>
                    <Link to="/operator" className="text-slate-600 hover:text-slate-900">
                      Operations
                    </Link>
                    <Link to="/operator/incidents" className="text-slate-600 hover:text-slate-900">
                      Incident queue
                    </Link>
                    <Link to="/operator/responders" className="text-slate-600 hover:text-slate-900">
                      Responders
                    </Link>
                  </>
                )}
                {user.role === 'RESPONDER' && (
                  <>
                    <Link to="/responder" className="text-slate-600 hover:text-slate-900">
                      My dashboard
                    </Link>
                    <Link to="/responder/assignments" className="text-slate-600 hover:text-slate-900">
                      My assignments
                    </Link>
                  </>
                )}
                {user.role !== 'OPERATOR' && user.role !== 'RESPONDER' && (
                  <>
                    <SosButton />
                    <Link to="/dashboard" className="text-slate-600 hover:text-slate-900">
                      Dashboard
                    </Link>
                    <Link to="/report-incident" className="text-slate-600 hover:text-slate-900">
                      Report
                    </Link>
                    <Link to="/incidents" className="text-slate-600 hover:text-slate-900">
                      My incidents
                    </Link>
                  </>
                )}
                {(user.role === 'OPERATOR' || user.role === 'ADMIN') && (
                  <Link to="/audit" className="text-slate-600 hover:text-slate-900">
                    Audit log
                  </Link>
                )}
                <NotificationBell />
                <span className="text-slate-500">
                  {user.fullName || user.email || 'Signed in'}{' '}
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs uppercase tracking-wide text-slate-600">
                    {user.role}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-100"
                >
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-slate-600 hover:text-slate-900">
                  Sign in
                </Link>
                <Link
                  to="/register"
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-white hover:bg-blue-700"
                >
                  Register
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        Smart Real-Time Emergency Response and Coordination System — Academic prototype
      </footer>
    </div>
  );
}