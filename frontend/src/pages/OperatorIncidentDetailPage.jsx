// frontend/src/pages/OperatorIncidentDetailPage.jsx
// OPERATOR incident detail — operational view, verify action for REPORTED,
// and responder assignment for VERIFIED incidents. Updates live via socket
// events without overwriting an in-flight operator action.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';
import { useSocketEvent } from '../socket/socketContext';
import PriorityBadge from '../components/PriorityBadge';
import SosBadge from '../components/SosBadge';
import StatusBadge from '../components/StatusBadge';
import AiSuggestionPanel from '../components/AiSuggestionPanel';
import { EMERGENCY_TYPE_LABELS, formatCoordinates, formatDate } from '../utils/incident';
import { haversineKm, formatDistanceKm } from '../utils/geo';

const CANCELABLE_STATUSES = ['REPORTED', 'VERIFIED', 'RESPONDER_ASSIGNED', 'RESPONDER_EN_ROUTE'];

const CLOSE_ACTIONS = {
  resolve: {
    key: 'resolve',
    apiMethod: 'resolveIncident',
    label: 'Resolve Incident',
    submittingLabel: 'Resolving…',
    confirmLabel: 'Confirm resolution',
    message:
      'Resolve this incident? The response has reached the scene and this officially closes the incident as resolved. This cannot be undone from here.',
  },
  cancel: {
    key: 'cancel',
    apiMethod: 'cancelIncident',
    label: 'Cancel Incident',
    submittingLabel: 'Cancelling…',
    confirmLabel: 'Confirm cancellation',
    message:
      'Cancel this incident? Any active responder assignment will be cancelled too. This cannot be undone from here.',
  },
};

export default function OperatorIncidentDetailPage() {
  const { id } = useParams();
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState('');
  const [verified, setVerified] = useState(false);
  const [closingAction, setClosingAction] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const [responders, setResponders] = useState([]);
  const [respondersLoading, setRespondersLoading] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedResponder, setSelectedResponder] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState('');
  const [assignSuccess, setAssignSuccess] = useState(false);

  // Guards: live socket refreshes never overwrite an in-flight operator action.
  const submittingRef = useRef(false);
  useEffect(() => {
    submittingRef.current = submitting || assigning;
  }, [submitting, assigning]);

  const load = useCallback(async () => {
    try {
      const { data } = await api.operatorIncident(id);
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

  const refreshIfRelevant = useCallback(
    (payload) => {
      const eventIncidentId = payload?.incident?.id || payload?.assignment?.incident?.id;
      if (eventIncidentId === id && !submittingRef.current) {
        load();
      }
    },
    [id, load]
  );

  useSocketEvent('incident:updated', refreshIfRelevant);
  useSocketEvent('incident:verified', refreshIfRelevant);
  useSocketEvent('incident:resolved', refreshIfRelevant);
  useSocketEvent('incident:cancelled', refreshIfRelevant);
  useSocketEvent('assignment:created', refreshIfRelevant);
  useSocketEvent('assignment:accepted', refreshIfRelevant);
  useSocketEvent('assignment:en_route', refreshIfRelevant);
  useSocketEvent('assignment:arrived', refreshIfRelevant);
  useSocketEvent('assignment:completed', refreshIfRelevant);

  async function confirmVerify() {
    setActionError('');
    setSuccessMessage('');
    setSubmitting(true);
    try {
      const { data } = await api.verifyIncident(id);
      setIncident(data);
      setVerified(true);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setSubmitting(false);
      setConfirming(false);
      setClosingAction(null);
    }
  }

  async function confirmClose() {
    const action = CLOSE_ACTIONS[closingAction];
    setActionError('');
    setSuccessMessage('');
    setSubmitting(true);
    try {
      const { data } = await api[action.apiMethod](id);
      setIncident(data);
      setSuccessMessage(`${action.label} successful.`);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setSubmitting(false);
      setClosingAction(null);
    }
  }

  async function openAssignmentPanel() {
    setAssignOpen(true);
    setAssignError('');
    setAssignSuccess(false);
    setSelectedResponder('');
    setRespondersLoading(true);
    try {
      const { data } = await api.operatorResponders({ availability: 'AVAILABLE' });
      setResponders(data);
    } catch (err) {
      setAssignError(err.message);
    } finally {
      setRespondersLoading(false);
    }
  }

  function responderDistance(responder) {
    if (
      responder.currentLatitude === null ||
      responder.currentLatitude === undefined ||
      responder.currentLongitude === null ||
      responder.currentLongitude === undefined
    ) {
      return null;
    }
    return haversineKm(
      incident.locationLatitude,
      incident.locationLongitude,
      responder.currentLatitude,
      responder.currentLongitude,
    );
  }

  async function confirmAssign() {
    setAssignError('');
    setAssigning(true);
    try {
      const { data } = await api.assignResponder(id, selectedResponder);
      setIncident(data.incident);
      setAssignSuccess(true);
      setAssignOpen(false);
    } catch (err) {
      setAssignError(err.message);
    } finally {
      setAssigning(false);
    }
  }

  if (loading) {
    return <p className="text-slate-500">Loading incident…</p>;
  }

  if (error) {
    return (
      <div>
        <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
        <Link to="/operator/incidents" className="mt-4 inline-block text-sm text-blue-600 hover:underline">
          ← Back to incident queue
        </Link>
      </div>
    );
  }

  const reporter = incident.reporter;
  const rows = [
    ['Type', EMERGENCY_TYPE_LABELS[incident.type] || incident.type],
    ['Severity', <PriorityBadge key="p" priority={incident.priority} />],
    ['Status', <StatusBadge key="s" status={incident.status} />],
    ['Source', incident.sourceSos ? 'SOS alert' : 'Standard report'],
    ['Location', incident.locationAddress || formatCoordinates(incident.locationLatitude, incident.locationLongitude)],
    ['Coordinates', formatCoordinates(incident.locationLatitude, incident.locationLongitude)],
    ['People affected', String(incident.peopleAffected)],
    ['Reported at', formatDate(incident.createdAt)],
  ];

  if (incident.verifiedAt) {
    rows.push(['Verified at', formatDate(incident.verifiedAt)]);
  }

  if (incident.resolvedBy) {
    rows.push(['Resolved by', incident.resolvedBy.fullName]);
    rows.push(['Resolved at', formatDate(incident.resolvedAt)]);
  }

  if (incident.cancelledBy) {
    rows.push(['Cancelled by', incident.cancelledBy.fullName]);
    rows.push(['Cancelled at', formatDate(incident.cancelledAt)]);
    if (incident.cancelReason) {
      rows.push(['Cancellation reason', incident.cancelReason]);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link to="/operator/incidents" className="mb-4 inline-block text-sm text-blue-600 hover:underline">
        ← Back to incident queue
      </Link>

      {verified && (
        <div className="mb-4 rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800">
          Incident verified successfully.
        </div>
      )}

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
          <StatusBadge status={incident.status} />
        </span>
      </div>
      <p className="mb-6 mt-1 text-sm text-slate-500">Incident ID: {incident.id}</p>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
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

        <div className="mt-6 border-t border-slate-100 pt-4">
          <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-slate-500">Reporter</h2>
          <p className="text-sm text-slate-700">{reporter.fullName || 'Anonymous'}</p>
          <p className="text-sm text-slate-600">{reporter.email}</p>
          {reporter.phone && <p className="text-sm text-slate-600">Phone: {reporter.phone}</p>}
          {!reporter.phone && (
            <p className="text-xs text-slate-400">Phone hidden — no contact consent.</p>
          )}
        </div>
      </div>

      <AiSuggestionPanel incidentId={incident.id} incident={incident} onUpdated={() => load()} />

      {incident.status === 'REPORTED' && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          {confirming ? (
            <div>
              <p className="text-sm text-slate-700">
                Verify this incident? This confirms the report is genuine and moves it to{' '}
                <strong>VERIFIED</strong>. This cannot be undone from here.
              </p>
              {actionError && (
                <div className="mt-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {actionError}
                </div>
              )}
              <div className="mt-3 flex gap-3">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={confirmVerify}
                  className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? 'Verifying…' : 'Confirm verification'}
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
              onClick={() => {
                setConfirming(true);
                setClosingAction(null);
                setActionError('');
              }}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Verify Incident
            </button>
          )}
        </div>
      )}

      {incident.status === 'VERIFIED' && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          {assignOpen ? (
            <div>
              <h2 className="mb-2 text-sm font-medium uppercase tracking-wide text-slate-500">
                Assign a responder
              </h2>
              {assignError && (
                <div className="mb-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {assignError}
                </div>
              )}
              {respondersLoading ? (
                <p className="text-sm text-slate-500">Loading available responders…</p>
              ) : responders.length === 0 ? (
                <p className="text-sm text-slate-500">No available responders to assign.</p>
              ) : (
                <>
                  <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
                    {responders.map((responder) => {
                      const distance = responderDistance(responder);
                      return (
                        <li key={responder.id}>
                          <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-slate-50">
                            <input
                              type="radio"
                              name="responder"
                              value={responder.id}
                              checked={selectedResponder === responder.id}
                              onChange={(event) => setSelectedResponder(event.target.value)}
                              className="accent-blue-600"
                            />
                            <span className="flex-1">
                              <span className="font-medium text-slate-800">
                                {responder.user?.fullName || 'Unnamed responder'}
                              </span>
                              <span className="block text-xs text-slate-500">
                                {responder.organization?.name} ·{' '}
                                {EMERGENCY_TYPE_LABELS[responder.specialization] || responder.specialization}
                              </span>
                            </span>
                            <span className="text-xs text-slate-500">
                              {distance === null ? 'Distance unknown' : formatDistanceKm(distance)}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="mt-3 flex gap-3">
                    <button
                      type="button"
                      disabled={assigning || !selectedResponder}
                      onClick={confirmAssign}
                      className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {assigning ? 'Assigning…' : 'Confirm assignment'}
                    </button>
                    <button
                      type="button"
                      disabled={assigning}
                      onClick={() => setAssignOpen(false)}
                      className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={openAssignmentPanel}
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Assign Responder
            </button>
          )}
        </div>
      )}

      {(incident.status === 'RESPONDER_ARRIVED' || CANCELABLE_STATUSES.includes(incident.status)) && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          {closingAction ? (
            <div>
              <p className="text-sm text-slate-700">{CLOSE_ACTIONS[closingAction].message}</p>
              {actionError && (
                <div className="mt-2 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {actionError}
                </div>
              )}
              <div className="mt-3 flex gap-3">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={confirmClose}
                  className={`rounded-md px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 ${
                    closingAction === 'cancel' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {submitting
                    ? CLOSE_ACTIONS[closingAction].submittingLabel
                    : CLOSE_ACTIONS[closingAction].confirmLabel}
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => {
                    setClosingAction(null);
                    setActionError('');
                  }}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-3">
              {incident.status === 'RESPONDER_ARRIVED' && (
                <button
                  type="button"
                  onClick={() => {
                    setClosingAction('resolve');
                    setConfirming(false);
                    setActionError('');
                  }}
                  className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                >
                  Resolve Incident
                </button>
              )}
              {CANCELABLE_STATUSES.includes(incident.status) && (
                <button
                  type="button"
                  onClick={() => {
                    setClosingAction('cancel');
                    setConfirming(false);
                    setActionError('');
                  }}
                  className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
                >
                  Cancel Incident
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {assignSuccess && (
        <div className="mt-4 rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800">
          Responder assigned. The incident is now in RESPONDER_ASSIGNED status.
        </div>
      )}
    </div>
  );
}