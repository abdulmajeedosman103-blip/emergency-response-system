// frontend/src/pages/DashboardPage.jsx
// Citizen landing page — quick actions plus recent incidents (live updates).
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/authContext';
import { useSocketEvent } from '../socket/socketContext';
import SosButton from '../components/SosButton';
import StatusBadge from '../components/StatusBadge';
import { EMERGENCY_TYPE_LABELS, formatCoordinates, formatDate } from '../utils/incident';

export default function DashboardPage() {
  const { user } = useAuth();
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await api.myIncidents();
      setIncidents(data);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Real-time: refresh when this user's incidents change state.
  useSocketEvent('incident:updated', () => load());
  useSocketEvent('incident:verified', () => load());
  useSocketEvent('incident:resolved', () => load());
  useSocketEvent('incident:cancelled', () => load());

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-800">
        Welcome, {user?.fullName || 'there'}
      </h1>
      <p className="mt-1 text-slate-600">
        Track and report emergencies from one place.
      </p>

      <div className="mt-6 rounded-lg border-2 border-red-200 bg-red-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-red-800">In immediate danger?</h2>
            <p className="mt-0.5 text-sm text-red-700">
              Send an emergency SOS alert with one tap. Use only for real emergencies.
            </p>
          </div>
          <SosButton label="Send SOS now" className="px-5 py-3 text-base" />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          to="/report-incident"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Report an emergency
        </Link>
        <Link
          to="/incidents"
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          My incidents
        </Link>
      </div>

      <section className="mt-10">
        <h2 className="mb-3 text-lg font-medium text-slate-800">Recent incidents</h2>

        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : error ? (
          <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        ) : incidents.length === 0 ? (
          <p className="text-sm text-slate-500">
            You have not reported any incidents yet.
          </p>
        ) : (
          <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white shadow-sm">
            {incidents.slice(0, 5).map((incident) => (
              <li key={incident.id} className="px-4 py-3">
                <Link to={`/incidents/${incident.id}`} className="block hover:bg-slate-50">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium text-slate-800">
                      {EMERGENCY_TYPE_LABELS[incident.type] || incident.type}
                    </span>
                    <StatusBadge status={incident.status} />
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    {incident.locationAddress ||
                      formatCoordinates(incident.locationLatitude, incident.locationLongitude)}{' '}
                    · {formatDate(incident.createdAt)}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {incidents.length > 5 && (
          <Link to="/incidents" className="mt-3 inline-block text-sm text-blue-600 hover:underline">
            View all incidents
          </Link>
        )}
      </section>
    </div>
  );
}