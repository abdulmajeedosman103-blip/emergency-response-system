// frontend/src/pages/ResponderAssignmentsPage.jsx
// RESPONDER assignment list — status filter, incident summary, links to detail.
// Refreshes in place on real-time assignment events.
import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useSocketEvent } from '../socket/socketContext';
import AssignmentStatusBadge from '../components/AssignmentStatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import { EMERGENCY_TYPE_LABELS, formatDate } from '../utils/incident';
import { formatDistanceKm } from '../utils/geo';

const STATUSES = ['PENDING', 'ACCEPTED', 'REJECTED', 'EN_ROUTE', 'ARRIVED', 'COMPLETED', 'CANCELLED'];
const LIMIT = 50;

export default function ResponderAssignmentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get('status') || '';

  const [assignments, setAssignments] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(
    async (silent = false) => {
      if (!silent) {
        setLoading(true);
        setError('');
      }
      try {
        const { data, meta: responseMeta } = await api.myAssignments({
          status: status || undefined,
          limit: LIMIT,
        });
        setAssignments(data);
        setMeta(responseMeta);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    },
    [status]
  );

  useEffect(() => {
    load();
  }, [load]);

  // Real-time: refresh when this responder's assignments change.
  useSocketEvent('assignment:created', () => load(true));
  useSocketEvent('assignment:accepted', () => load(true));
  useSocketEvent('assignment:en_route', () => load(true));
  useSocketEvent('assignment:arrived', () => load(true));
  useSocketEvent('assignment:completed', () => load(true));

  const selectClass =
    'rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none';

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-800">My assignments</h1>
        <select
          value={status}
          onChange={(event) => {
            const next = new URLSearchParams(searchParams);
            if (event.target.value) {
              next.set('status', event.target.value);
            } else {
              next.delete('status');
            }
            setSearchParams(next);
          }}
          className={selectClass}
          aria-label="Filter by assignment status"
        >
          <option value="">All statuses</option>
          {STATUSES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </div>
      {meta && (
        <p className="mt-1 text-sm text-slate-500">
          {meta.total} assignment{meta.total === 1 ? '' : 's'}
          {status ? ` in ${status}` : ''}
          {meta.total > LIMIT && ` (showing first ${LIMIT})`}.
        </p>
      )}

      {loading ? (
        <p className="mt-8 text-sm text-slate-500">Loading…</p>
      ) : error ? (
        <div className="mt-8 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : assignments.length === 0 ? (
        <div className="mt-8 rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No assignments to show.
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white shadow-sm">
          {assignments.map((assignment) => (
            <li key={assignment.id} className="px-4 py-3">
              <Link to={`/responder/assignments/${assignment.id}`} className="block hover:bg-slate-50">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-slate-800">
                    {EMERGENCY_TYPE_LABELS[assignment.incident.type] || assignment.incident.type}
                  </span>
                  <span className="flex items-center gap-2">
                    <PriorityBadge priority={assignment.incident.priority} />
                    <AssignmentStatusBadge status={assignment.status} />
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {assignment.distanceKmAtAssignment !== null &&
                    assignment.distanceKmAtAssignment !== undefined &&
                    `${formatDistanceKm(assignment.distanceKmAtAssignment)} · `}
                  assigned {formatDate(assignment.assignedAt)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}