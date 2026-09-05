// frontend/src/pages/OperatorAuditLogPage.jsx
// Read-only audit trail for OPERATOR and ADMIN. Server-side filtered +
// paginated; imported from the frozen AuditLog model via /operator/audit-logs.
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { formatDate } from '../utils/incident';
import {
  AUDIT_ACTION_TONES,
  AUDIT_ENTITY_TYPES,
  formatAuditAction,
} from '../utils/audit';

const DEFAULT_ACTIONS = [];

export default function OperatorAuditLogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const action = searchParams.get('action') || '';
  const entityType = searchParams.get('entityType') || '';
  const entityId = searchParams.get('entityId') || '';
  const actorId = searchParams.get('actorId') || '';
  const from = searchParams.get('from') || '';
  const to = searchParams.get('to') || '';
  const page = Math.max(1, Number(searchParams.get('page') || 1));

  const [logs, setLogs] = useState([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [actionOptions, setActionOptions] = useState(DEFAULT_ACTIONS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.auditMeta().catch(() => {}).then((result) => {
      if (result && result.data && result.data.actions) {
        setActionOptions(result.data.actions);
      }
    });
  }, []);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) {
        setLoading(true);
        setError('');
      }
      try {
        const result = await api.auditLogs({
          action: action || undefined,
          entityType: entityType || undefined,
          entityId: entityId || undefined,
          actorId: actorId || undefined,
          from: from || undefined,
          to: to || undefined,
          page,
        });
        setLogs(result.data);
        setMeta(result.meta);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [action, entityType, entityId, actorId, from, to, page]
  );

  useEffect(() => {
    load();
  }, [load]);

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

  function describeDetails(details) {
    if (!details) {
      return null;
    }
    const parts = [];
    if (details.from && details.to) {
      parts.push(`${details.from} → ${details.to}`);
    } else if (details.incidentId) {
      parts.push(`incident ${details.incidentId.slice(0, 8)}`);
    }
    if (details.responderId) {
      parts.push(`responder ${details.responderId.slice(0, 8)}`);
    }
    if (details.type) {
      parts.push(details.type);
    }
    return parts.length > 0 ? parts.join(' · ') : JSON.stringify(details);
  }

  const hasFilters = Boolean(action || entityType || entityId || actorId || from || to);
  const selectClass =
    'rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none';
  const inputClass =
    'rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none';

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-800">Audit log</h1>
      <p className="mt-1 text-sm text-slate-500">
        {meta.total} recorded action(s) match the current filters.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <select
          value={action}
          onChange={(event) => updateParams({ action: event.target.value, page: 1 })}
          className={selectClass}
          aria-label="Filter by action"
        >
          <option value="">All actions</option>
          {actionOptions.map((value) => (
            <option key={value} value={value}>
              {formatAuditAction(value)}
            </option>
          ))}
        </select>
        <select
          value={entityType}
          onChange={(event) => updateParams({ entityType: event.target.value, page: 1 })}
          className={selectClass}
          aria-label="Filter by entity type"
        >
          <option value="">All entity types</option>
          {AUDIT_ENTITY_TYPES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <input
          type="text"
          value={entityId}
          onChange={(event) => updateParams({ entityId: event.target.value, page: 1 })}
          placeholder="Entity ID"
          className={inputClass}
          aria-label="Filter by entity ID"
        />
        <input
          type="text"
          value={actorId}
          onChange={(event) => updateParams({ actorId: event.target.value, page: 1 })}
          placeholder="Actor ID"
          className={inputClass}
          aria-label="Filter by actor ID"
        />
        <input
          type="date"
          value={from}
          onChange={(event) => updateParams({ from: event.target.value, page: 1 })}
          className={inputClass}
          aria-label="Filter from date"
        />
        <input
          type="date"
          value={to}
          onChange={(event) => updateParams({ to: event.target.value, page: 1 })}
          className={inputClass}
          aria-label="Filter to date"
        />
        {hasFilters && (
          <button
            type="button"
            onClick={() =>
              updateParams({
                action: '',
                entityType: '',
                entityId: '',
                actorId: '',
                from: '',
                to: '',
                page: 1,
              })
            }
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
      ) : logs.length === 0 ? (
        <div className="mt-8 rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No audit records match the current filters.
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2">When</th>
                <th className="px-4 py-2">Actor</th>
                <th className="px-4 py-2">Action</th>
                <th className="px-4 py-2">Entity</th>
                <th className="px-4 py-2">Details</th>
                <th className="px-4 py-2">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((entry) => (
                <tr key={entry.id} className="align-top">
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                    {formatDate(entry.createdAt)}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    <span className="block">{entry.actor ? entry.actor.fullName : '—'}</span>
                    <span className="block text-xs text-slate-400">
                      {entry.actor ? entry.actor.email : 'System / public'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${AUDIT_ACTION_TONES[entry.action] || 'bg-slate-100 text-slate-700'}`}
                    >
                      {formatAuditAction(entry.action)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    <span className="font-medium">{entry.entityType}</span>
                    {entry.entityId && (
                      <span className="block font-mono text-[11px] text-slate-400">
                        {entry.entityId}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {describeDetails(entry.details)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">{entry.ipAddress || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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