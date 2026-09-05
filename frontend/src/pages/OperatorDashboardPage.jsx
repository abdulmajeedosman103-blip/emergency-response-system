// frontend/src/pages/OperatorDashboardPage.jsx
// OPERATOR landing page — summary counts plus recent incidents (live updates).
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../auth/authContext';
import { useSocketEvent } from '../socket/socketContext';
import PriorityBadge from '../components/PriorityBadge';
import SosBadge from '../components/SosBadge';
import StatusBadge from '../components/StatusBadge';
import { EMERGENCY_TYPE_LABELS, formatCoordinates, formatDate } from '../utils/incident';

const PRIORITY_ORDER = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

export default function OperatorDashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [aiStats, setAiStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      const [{ data: incidents }, stats] = await Promise.all([
        api.operatorIncidents({ limit: 100 }),
        api.aiStats().catch(() => null),
      ]);
      setData(incidents);
      setAiStats(stats?.data || null);
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

  // Real-time: dashboard refreshes when anything changes in the queue.
  useSocketEvent('incident:created', () => load());
  useSocketEvent('incident:sos', () => load());
  useSocketEvent('incident:verified', () => load());
  useSocketEvent('incident:updated', () => load());
  useSocketEvent('incident:resolved', () => load());
  useSocketEvent('incident:cancelled', () => load());

  const byStatus = {};
  const byPriority = {};
  let sosCount = 0;
  for (const incident of data) {
    byStatus[incident.status] = (byStatus[incident.status] || 0) + 1;
    byPriority[incident.priority] = (byPriority[incident.priority] || 0) + 1;
    if (incident.sourceSos) {
      sosCount += 1;
    }
  }
  const awaitingVerification = byStatus.REPORTED || 0;
  const verified = byStatus.VERIFIED || 0;

  const cards = [
    { label: 'Total incidents', value: data.length, to: '/operator/incidents' },
    { label: 'Awaiting verification', value: awaitingVerification, to: '/operator/incidents?status=REPORTED', highlight: awaitingVerification > 0 },
    { label: 'Verified', value: verified, to: '/operator/incidents?status=VERIFIED' },
    { label: 'SOS alerts', value: sosCount, to: '/operator/incidents?sourceSos=true', highlight: sosCount > 0 },
  ];

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-800">
        Operations, {user?.fullName || 'there'}
      </h1>
      <p className="mt-1 text-slate-600">Monitor incoming reports and verify incidents.</p>

      {error && (
        <div className="mt-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <p className="mt-8 text-sm text-slate-500">Loading…</p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
            {cards.map((card) => (
              <Link
                key={card.label}
                to={card.to}
                className={`rounded-lg border p-4 shadow-sm transition hover:shadow ${
                  card.highlight ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'
                }`}
              >
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {card.label}
                </dt>
                <dd className="mt-1 text-2xl font-semibold text-slate-800">{card.value}</dd>
              </Link>
            ))}
          </div>

          {awaitingVerification > 0 && (
            <Link
              to="/operator/incidents?status=REPORTED"
              className="mt-6 inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Review {awaitingVerification} incident{awaitingVerification === 1 ? '' : 's'} awaiting verification
            </Link>
          )}

          {aiStats && (
            <section className="mt-10">
              <h2 className="mb-3 text-lg font-medium text-slate-800">AI triage evaluation</h2>
              <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {[
                  { label: 'AI-processed incidents', value: aiStats.totalProcessed },
                  { label: 'Accepted by operators', value: aiStats.accepted },
                  { label: 'Agreement rate', value: aiStats.totalProcessed ? `${Math.round(aiStats.agreementRate * 100)}%` : '—' },
                  { label: 'Override rate', value: aiStats.totalProcessed ? `${Math.round(aiStats.overrideRate * 100)}%` : '—' },
                ].map((card) => (
                  <div key={card.label} className="rounded-lg border border-indigo-200 bg-white p-4 shadow-sm">
                    <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{card.label}</dt>
                    <dd className="mt-1 text-2xl font-semibold text-slate-800">{card.value}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          <section className="mt-10">
            <h2 className="mb-3 text-lg font-medium text-slate-800">Recent incidents</h2>
            {data.length === 0 ? (
              <p className="text-sm text-slate-500">No incidents to show.</p>
            ) : (
              <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white shadow-sm">
                {data.slice(0, 8).map((incident) => (
                  <li key={incident.id} className="px-4 py-3">
                    <Link to={`/operator/incidents/${incident.id}`} className="block hover:bg-slate-50">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-medium text-slate-800">
                          {EMERGENCY_TYPE_LABELS[incident.type] || incident.type}
                        </span>
                        <span className="flex items-center gap-2">
                          {incident.sourceSos && <SosBadge />}
                          <PriorityBadge priority={incident.priority} />
                          <StatusBadge status={incident.status} />
                        </span>
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
          </section>
        </>
      )}
    </div>
  );
}