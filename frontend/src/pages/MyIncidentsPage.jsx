// frontend/src/pages/MyIncidentsPage.jsx
import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { api } from '../api/client';
import { useSocketEvent } from '../socket/socketContext';
import StatusBadge from '../components/StatusBadge';
import {
  EMERGENCY_PRIORITY_LABELS,
  EMERGENCY_TYPE_LABELS,
  formatCoordinates,
  formatDate,
} from '../utils/incident';

export default function MyIncidentsPage() {
  const location = useLocation();
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

  if (loading) {
    return <p className="text-slate-500">Loading your incidents…</p>;
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-800">My incidents</h1>
        <Link
          to="/report-incident"
          className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
        >
          Report an emergency
        </Link>
      </div>

      {location.state?.reportedSuccess && (
        <div className="mb-4 rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-700">
          Your incident report was submitted successfully.
        </div>
      )}

      {incidents.length === 0 ? (
        <p className="text-slate-500">You have not reported any incidents yet.</p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white shadow-sm">
          {incidents.map((incident) => (
            <li key={incident.id} className="px-4 py-3">
              <Link to={`/incidents/${incident.id}`} className="block hover:bg-slate-50">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-slate-800">
                    {EMERGENCY_TYPE_LABELS[incident.type] || incident.type}
                    {incident.priority && (
                      <span className="ml-2 text-xs font-normal text-slate-500">
                        {EMERGENCY_PRIORITY_LABELS[incident.priority] || incident.priority} severity
                      </span>
                    )}
                  </span>
                  <StatusBadge status={incident.status} />
                </div>
                <p className="mt-1 line-clamp-2 text-sm text-slate-600">{incident.description}</p>
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
    </div>
  );
}