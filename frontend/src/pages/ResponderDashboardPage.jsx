// frontend/src/pages/ResponderDashboardPage.jsx
// RESPONDER landing page — profile, availability controls, recent assignments.
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { useSocketEvent } from '../socket/socketContext';
import AssignmentStatusBadge from '../components/AssignmentStatusBadge';
import AvailabilityBadge from '../components/AvailabilityBadge';
import PriorityBadge from '../components/PriorityBadge';
import { EMERGENCY_TYPE_LABELS, formatDate } from '../utils/incident';
import { formatDistanceKm } from '../utils/geo';

const AVAILABILITIES = [
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'BUSY', label: 'Busy' },
  { value: 'OFFLINE', label: 'Offline' },
];

export default function ResponderDashboardPage() {
  const [profile, setProfile] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [profileRes, assignmentsRes] = await Promise.all([
        api.responderMe(),
        api.myAssignments({ limit: 5 }),
      ]);
      setProfile(profileRes.data);
      setAssignments(assignmentsRes.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Real-time: refresh when assignments change (new or transitioned).
  useSocketEvent('assignment:created', () => load());
  useSocketEvent('assignment:accepted', () => load());
  useSocketEvent('assignment:en_route', () => load());
  useSocketEvent('assignment:arrived', () => load());
  useSocketEvent('assignment:completed', () => load());

  async function updateAvailability(value) {
    if (value === profile.availability) {
      return;
    }
    setUpdating(true);
    setUpdateError('');
    try {
      const { data } = await api.updateAvailability(value);
      setProfile(data);
    } catch (err) {
      setUpdateError(err.message);
    } finally {
      setUpdating(false);
    }
  }

  if (loading) {
    return <p className="text-slate-500">Loading your dashboard…</p>;
  }

  if (error) {
    return (
      <div className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
        {error}
      </div>
    );
  }

  const organization = profile.organization?.name || 'No organization';

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-800">
        {profile.user?.fullName || 'Responder'}, {organization}
      </h1>
      <p className="mt-1 text-slate-600">Manage your availability and review your assignments.</p>

      {updateError && (
        <div className="mt-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {updateError}
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-500">Availability</h2>
          <div className="flex items-center gap-2">
            <AvailabilityBadge availability={profile.availability} />
            {profile.currentLatitude !== null && profile.currentLatitude !== undefined && (
              <span className="text-xs text-slate-400">
                Location: {Number(profile.currentLatitude).toFixed(4)},{' '}
                {Number(profile.currentLongitude).toFixed(4)}
              </span>
            )}
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Set your availability so operators know when they can assign you.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {AVAILABILITIES.map((option) => (
              <button
                key={option.value}
                type="button"
                disabled={updating || option.value === profile.availability}
                onClick={() => updateAvailability(option.value)}
                className={`rounded-md px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50 ${
                  option.value === profile.availability
                    ? 'bg-blue-600 text-white'
                    : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-100'
                }`}
              >
                {updating ? 'Saving…' : option.label}
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-slate-500">Assignment summary</h2>
          <p className="text-3xl font-semibold text-slate-800">{assignments.length === 5 ? '5+' : assignments.length}</p>
          <p className="mt-1 text-sm text-slate-500">recent assignment(s)</p>
        </section>
      </div>

      <section className="mt-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-medium text-slate-800">Recent assignments</h2>
          <Link to="/responder/assignments" className="text-sm text-blue-600 hover:underline">
            View all
          </Link>
        </div>
        {assignments.length === 0 ? (
          <p className="text-sm text-slate-500">No assignments yet.</p>
        ) : (
          <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white shadow-sm">
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
      </section>
    </div>
  );
}