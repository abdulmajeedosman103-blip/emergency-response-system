// frontend/src/pages/IncidentDetailPage.jsx
import { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useSocketEvent } from '../socket/socketContext';
import StatusBadge from '../components/StatusBadge';
import {
  EMERGENCY_PRIORITY_LABELS,
  EMERGENCY_TYPE_LABELS,
  formatCoordinates,
  formatDate,
} from '../utils/incident';

export default function IncidentDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await api.incident(id);
      setIncident(data);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Real-time: refresh this incident whenever its workflow advances.
  useSocketEvent('incident:updated', (payload) => {
    if (payload?.incident?.id === id) {
      load();
    }
  });
  useSocketEvent('incident:verified', (payload) => {
    if (payload?.incident?.id === id) {
      load();
    }
  });
  useSocketEvent('incident:resolved', (payload) => {
    if (payload?.incident?.id === id) {
      load();
    }
  });
  useSocketEvent('incident:cancelled', (payload) => {
    if (payload?.incident?.id === id) {
      load();
    }
  });

  if (loading) {
    return <p className="text-slate-500">Loading incident…</p>;
  }

  if (error) {
    return (
      <div>
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
        <Link to="/incidents" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
          ← Back to my incidents
        </Link>
      </div>
    );
  }

  const rows = [
    ['Type', EMERGENCY_TYPE_LABELS[incident.type] || incident.type],
    ['Severity', EMERGENCY_PRIORITY_LABELS[incident.priority] || incident.priority],
    ['Status', <StatusBadge key="status" status={incident.status} />],
    ['Location', incident.locationAddress || formatCoordinates(incident.locationLatitude, incident.locationLongitude)],
    ['Coordinates', formatCoordinates(incident.locationLatitude, incident.locationLongitude)],
    ['People affected', String(incident.peopleAffected)],
    ['Reported at', formatDate(incident.createdAt)],
    ['Contact consent', incident.citizenContactConsent ? 'Yes' : 'No'],
  ];

  return (
    <div className="mx-auto max-w-2xl">
      {location.state?.sosSuccess && (
        <div className="mb-4 rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800">
          SOS alert sent successfully. Help has been notified — this is your emergency incident.
        </div>
      )}

      <Link to="/incidents" className="mb-4 inline-block text-sm text-blue-600 hover:underline">
        ← Back to my incidents
      </Link>

      <h1 className="mb-1 text-2xl font-semibold text-slate-800">
        {EMERGENCY_TYPE_LABELS[incident.type] || incident.type} incident
      </h1>
      <p className="mb-6 text-sm text-slate-500">Incident ID: {incident.id}</p>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-slate-500">
          Description
        </h2>
        <p className="text-slate-700">{incident.description}</p>

        <dl className="mt-6 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                {label}
              </dt>
              <dd className="mt-0.5 text-sm text-slate-800">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}