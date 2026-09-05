// frontend/src/pages/ResponderAssignmentDetailPage.jsx
// RESPONDER assignment detail — incident summary, assignment status timeline,
// and a single deliberate action driven by the current assignment status.
// Live socket updates refresh the view without overwriting an in-flight action.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useSocketEvent } from '../socket/socketContext';
import AssignmentStatusBadge from '../components/AssignmentStatusBadge';
import PriorityBadge from '../components/PriorityBadge';
import SosBadge from '../components/SosBadge';
import StatusBadge from '../components/StatusBadge';
import { EMERGENCY_TYPE_LABELS, formatCoordinates, formatDate } from '../utils/incident';
import { formatDistanceKm } from '../utils/geo';

// Checkpoint order for the assignment timeline.
const STEP_ORDER = ['PENDING', 'ACCEPTED', 'EN_ROUTE', 'ARRIVED', 'COMPLETED'];

// The one responder action valid in each assignment state (if any).
const ACTION_BY_STATUS = {
  PENDING: {
    key: 'accept',
    apiMethod: 'acceptAssignment',
    label: 'Accept Assignment',
    confirmLabel: 'Confirm acceptance',
    submittingLabel: 'Accepting…',
    message:
      'Accept this assignment? You will be committed to responding to this incident. Read the details carefully before continuing. This cannot be undone from here.',
  },
  ACCEPTED: {
    key: 'en-route',
    apiMethod: 'enRouteAssignment',
    label: 'Start Journey',
    confirmLabel: 'Confirm start',
    submittingLabel: 'Starting…',
    message: 'Mark this assignment as en route? This tells the operations team you are travelling to the scene.',
  },
  EN_ROUTE: {
    key: 'arrive',
    apiMethod: 'arriveAssignment',
    label: 'Mark as Arrived',
    confirmLabel: 'Confirm arrival',
    submittingLabel: 'Confirming…',
    message: 'Mark that you have arrived at the scene? This cannot be undone from here.',
  },
  ARRIVED: {
    key: 'complete',
    apiMethod: 'completeAssignment',
    label: 'Complete Response',
    confirmLabel: 'Confirm completion',
    submittingLabel: 'Completing…',
    message: 'Complete this response? Your work on this assignment will be recorded as finished. This cannot be undone from here.',
  },
};

export default function ResponderAssignmentDetailPage() {
  const { id } = useParams();
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.assignment(id);
      setAssignment(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // Guard: never overwrite an in-flight responder action with a socket refresh.
  const submittingRef = useRef(false);
  useEffect(() => {
    submittingRef.current = submitting || confirming;
  }, [submitting, confirming]);

  const refreshIfMine = useCallback(
    (payload) => {
      if (payload?.assignment?.id === id && !submittingRef.current) {
        load();
      }
    },
    [id, load]
  );

  // Real-time: this assignment's status and linked incident updates.
  useSocketEvent('assignment:accepted', refreshIfMine);
  useSocketEvent('assignment:en_route', refreshIfMine);
  useSocketEvent('assignment:arrived', refreshIfMine);
  useSocketEvent('assignment:completed', refreshIfMine);
  useSocketEvent('assignment:created', refreshIfMine);
  useSocketEvent('incident:updated', refreshIfMine);
  useSocketEvent('incident:cancelled', refreshIfMine);
  useSocketEvent('incident:resolved', refreshIfMine);

  async function confirmAction() {
    const action = ACTION_BY_STATUS[assignment.status];
    if (!action) {
      return;
    }
    setActionError('');
    setSuccessMessage('');
    setSubmitting(true);
    try {
      const { data } = await api[action.apiMethod](id);
      setAssignment(data);
      setConfirming(false);
      setSuccessMessage(`${action.label} successful.`);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="text-slate-500">Loading assignment…</p>;
  }

  if (error) {
    return (
      <div>
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
        <Link to="/responder/assignments" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
          ← Back to my assignments
        </Link>
      </div>
    );
  }

  const incident = assignment.incident;
  const action = ACTION_BY_STATUS[assignment.status];
  const currentStep = STEP_ORDER.indexOf(assignment.status);

  const rows = [
    ['Type', EMERGENCY_TYPE_LABELS[incident.type] || incident.type],
    ['Priority', <PriorityBadge key="p" priority={incident.priority} />],
    ['Assignment status', <AssignmentStatusBadge key="s" status={assignment.status} />],
    ['Incident status', <StatusBadge key="is" status={incident.status} />],
    ['Source', incident.sourceSos ? 'SOS alert' : 'Standard report'],
    ['Location', incident.locationAddress || formatCoordinates(incident.locationLatitude, incident.locationLongitude)],
    ['Distance at assignment', formatDistanceKm(assignment.distanceKmAtAssignment)],
    ['Assigned at', formatDate(assignment.assignedAt)],
    ['Responded at', formatDate(assignment.respondedAt)],
    ['Completed at', formatDate(assignment.completedAt)],
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/responder/assignments" className="mb-4 inline-block text-sm text-blue-600 hover:underline">
        ← Back to my assignments
      </Link>

      {successMessage && (
        <div className="mb-4 rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800">
          {successMessage}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold text-slate-800">
          {EMERGENCY_TYPE_LABELS[incident.type] || incident.type} incident
        </h1>
        <span className="flex items-center gap-2">
          {incident.sourceSos && <SosBadge />}
          <AssignmentStatusBadge status={assignment.status} />
        </span>
      </div>
      <p className="mb-6 mt-1 text-sm text-slate-500">Assignment ID: {assignment.id}</p>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <ol className="flex flex-wrap items-center gap-y-2">
          {STEP_ORDER.map((step, index) => {
            const done = index < currentStep;
            const current = index === currentStep;
            return (
              <li key={step} className="flex items-center">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-medium ${
                    current
                      ? 'bg-blue-600 text-white'
                      : done
                        ? 'bg-green-100 text-green-700'
                        : 'bg-slate-100 text-slate-500'
                  }`}
                >
                  {done ? '✓ ' : ''}
                  {step}
                </span>
                {index < STEP_ORDER.length - 1 && (
                  <span className={`mx-2 h-px w-6 ${index < currentStep ? 'bg-green-300' : 'bg-slate-200'}`} />
                )}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-slate-500">Description</h2>
        <p className="text-slate-700">{incident.description}</p>

        <dl className="mt-6 grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
              <dd className="mt-0.5 text-sm text-slate-800">{value}</dd>
            </div>
          ))}
        </dl>
      </div>

      {action && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          {confirming ? (
            <div>
              <p className="text-sm text-slate-700">{action.message}</p>
              {actionError && (
                <div className="mt-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {actionError}
                </div>
              )}
              <div className="mt-3 flex gap-3">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={confirmAction}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? action.submittingLabel : action.confirmLabel}
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    setConfirming(false);
                    setActionError('');
                  }}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}