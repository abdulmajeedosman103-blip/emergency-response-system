// frontend/src/pages/OperatorIncidentListPage.jsx
// OPERATOR incident queue with status/priority/type/SOS filters and pagination.
// Refreshes in place (no full page reload) on real-time workflow events.
import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useSocketEvent } from '../socket/socketContext';
import PriorityBadge from '../components/PriorityBadge';
import SosBadge from '../components/SosBadge';
import StatusBadge from '../components/StatusBadge';
import {
  EMERGENCY_PRIORITIES,
  EMERGENCY_TYPES,
  EMERGENCY_TYPE_LABELS,
  formatCoordinates,
  formatDate,
} from '../utils/incident';

function aiBadge(incident) {
  if (!incident.aiProcessedAt) {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-400">
        AI unavailable
      </span>
    );
  }
  if (incident.aiOverridden) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
        AI overridden
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-[11px] font-medium text-indigo-700">
      AI: {EMERGENCY_TYPE_LABELS[incident.aiCategorySuggestion] || incident.aiCategorySuggestion} /{' '}
      {incident.aiPrioritySuggestion}{' '}
      {typeof incident.aiConfidence === 'number'
        ? `· ${Math.round(incident.aiConfidence * 100)}%`
        : ''}
    </span>
  );
}

const STATUSES = [
  'REPORTED',
  'VERIFIED',
  'RESPONDER_ASSIGNED',
  'RESPONDER_EN_ROUTE',
  'RESPONDER_ARRIVED',
  'RESOLVED',
  'CANCELLED',
];

export default function OperatorIncidentListPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const status = searchParams.get('status') || '';
  const priority = searchParams.get('priority') || '';
  const type = searchParams.get('type') || '';
  const sourceSos = searchParams.get('sourceSos') || '';
  const page = Math.max(1, Number(searchParams.get('page') || 1));

  const [incidents, setIncidents] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(
    async (silent = false) => {
      if (!silent) {
        setLoading(true);
        setError('');
      }
      try {
        const result = await api.operatorIncidents({
          status: status || undefined,
          priority: priority || undefined,
          type: type || undefined,
          sourceSos: sourceSos || undefined,
          page,
        });
        setIncidents(result.data);
        setMeta(result.meta);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [status, priority, type, sourceSos, page]
  );

  useEffect(() => {
    load();
  }, [load]);

  // Real-time: refresh the queue whenever relevant events arrive.
  useSocketEvent('incident:created', () => load(true));
  useSocketEvent('incident:sos', () => load(true));
  useSocketEvent('incident:verified', () => load(true));
  useSocketEvent('incident:updated', () => load(true));
  useSocketEvent('incident:resolved', () => load(true));
  useSocketEvent('incident:cancelled', () => load(true));

  function updateParams(next) {
    const merged = new URLSearchParams(searchParams);
    Object.entries(next).forEach(([key, value]) => {
      if (value && value !== '') {
        merged.set(key, value);
      } else {
        merged.delete(key);
      }
    });
    if (!next.page || next.page === 1) {
      merged.delete('page');
    }
    setSearchParams(merged);
  }

  const selectClass =
    'rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none';

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-800">Incident queue</h1>
      <p className="mt-1 text-sm text-slate-500">{meta.total} incident(s) match the current filters.</p>

      <div className="mt-4 flex flex-wrap gap-3">
        <select
          value={status}
          onChange={(event) => updateParams({ status: event.target.value, page: 1 })}
          className={selectClass}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {STATUSES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select
          value={priority}
          onChange={(event) => updateParams({ priority: event.target.value, page: 1 })}
          className={selectClass}
          aria-label="Filter by priority"
        >
          <option value="">All priorities</option>
          {[...EMERGENCY_PRIORITIES].reverse().map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select
          value={type}
          onChange={(event) => updateParams({ type: event.target.value, page: 1 })}
          className={selectClass}
          aria-label="Filter by type"
        >
          <option value="">All types</option>
          {EMERGENCY_TYPES.map((value) => (
            <option key={value} value={value}>
              {EMERGENCY_TYPE_LABELS[value]}
            </option>
          ))}
        </select>
        <select
          value={sourceSos}
          onChange={(event) => updateParams({ sourceSos: event.target.value, page: 1 })}
          className={selectClass}
          aria-label="Filter by SOS source"
        >
          <option value="">All sources</option>
          <option value="true">SOS only</option>
          <option value="false">Standard reports only</option>
        </select>
        {(status || priority || type || sourceSos) && (
          <button
            type="button"
            onClick={() => updateParams({ status: '', priority: '', type: '', sourceSos: '', page: 1 })}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
          >
            Clear filters
          </button>
        )}
      </div>

      {loading ? (
        <p className="mt-8 text-sm text-slate-500">Loading…</p>
      ) : error ? (
        <div className="mt-8 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : incidents.length === 0 ? (
        <div className="mt-8 rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No incidents match the current filters.
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white shadow-sm">
          {incidents.map((incident) => (
            <li key={incident.id} className="px-4 py-3">
              <Link to={`/operator/incidents/${incident.id}`} className="block hover:bg-slate-50">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-slate-800">
                    {EMERGENCY_TYPE_LABELS[incident.type] || incident.type}
                  </span>
                  <span className="flex items-center gap-2">
                    {incident.sourceSos && <SosBadge />}
                    {aiBadge(incident)}
                    <PriorityBadge priority={incident.priority} />
                    <StatusBadge status={incident.status} />
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-slate-400">
                  {incident.description}
                </p>
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

      {meta.totalPages > 1 && !loading && (
        <div className="mt-4 flex items-center justify-between">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => updateParams({ page: page - 1 })}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-slate-500">
            Page {meta.page} of {meta.totalPages}
          </span>
          <button
            type="button"
            disabled={page >= meta.totalPages}
            onClick={() => updateParams({ page: page + 1 })}
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}