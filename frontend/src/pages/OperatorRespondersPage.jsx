// frontend/src/pages/OperatorRespondersPage.jsx
// OPERATOR responder directory with availability/specialization/organization filters.
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import AvailabilityBadge from '../components/AvailabilityBadge';
import { EMERGENCY_TYPE_LABELS } from '../utils/incident';

const AVAILABILITIES = ['AVAILABLE', 'BUSY', 'OFFLINE'];
const SPECIALIZATIONS = ['MEDICAL', 'FIRE', 'ROAD_ACCIDENT', 'CRIME', 'NATURAL_DISASTER', 'OTHER'];

function formatCoords(lat, lng) {
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return 'Location unavailable';
  }
  return `${Number(lat).toFixed(4)}, ${Number(lng).toFixed(4)}`;
}

export default function OperatorRespondersPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const availability = searchParams.get('availability') || '';
  const specialization = searchParams.get('specialization') || '';
  const organization = searchParams.get('organization') || '';

  const [responders, setResponders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const { data } = await api.operatorResponders({
          availability: availability || undefined,
          specialization: specialization || undefined,
          organization: organization || undefined,
        });
        if (active) {
          setResponders(data);
        }
      } catch (err) {
        if (active) {
          setError(err.message);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [availability, specialization, organization]);

  const organizationOptions = [...new Set(responders.map((r) => r.organization?.name).filter(Boolean))];

  function updateParams(field, value) {
    const next = new URLSearchParams(searchParams);
    if (value && value !== '') {
      next.set(field, value);
    } else {
      next.delete(field);
    }
    setSearchParams(next);
  }

  const selectClass =
    'rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none';

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-800">Responders</h1>
      <p className="mt-1 text-sm text-slate-500">
        {responders.length} responder(s) match the current filters.
      </p>

      <div className="mt-4 flex flex-wrap gap-3">
        <select
          value={availability}
          onChange={(event) => updateParams('availability', event.target.value)}
          className={selectClass}
          aria-label="Filter by availability"
        >
          <option value="">All availabilities</option>
          {AVAILABILITIES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select
          value={specialization}
          onChange={(event) => updateParams('specialization', event.target.value)}
          className={selectClass}
          aria-label="Filter by specialty"
        >
          <option value="">All specialties</option>
          {SPECIALIZATIONS.map((value) => (
            <option key={value} value={value}>
              {EMERGENCY_TYPE_LABELS[value]}
            </option>
          ))}
        </select>
        <select
          value={organization}
          onChange={(event) => updateParams('organization', event.target.value)}
          className={selectClass}
          aria-label="Filter by organization"
        >
          <option value="">All organizations</option>
          {organizationOptions.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        {(availability || specialization || organization) && (
          <button
            type="button"
            onClick={() => setSearchParams({})}
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
      ) : responders.length === 0 ? (
        <div className="mt-8 rounded-lg border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No responders match the current filters.
        </div>
      ) : (
        <ul className="mt-6 divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white shadow-sm">
          {responders.map((responder) => (
            <li key={responder.id} className="px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-800">{responder.user?.fullName || 'Unnamed responder'}</p>
                  <p className="text-xs text-slate-500">
                    {responder.organization?.name} · {EMERGENCY_TYPE_LABELS[responder.specialization] || responder.specialization}
                  </p>
                </div>
                <span className="flex items-center gap-2">
                  {responder.activeAssignmentStatus && (
                    <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                      Active: {responder.activeAssignmentStatus}
                    </span>
                  )}
                  <AvailabilityBadge availability={responder.availability} />
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-400">
                {formatCoords(responder.currentLatitude, responder.currentLongitude)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}