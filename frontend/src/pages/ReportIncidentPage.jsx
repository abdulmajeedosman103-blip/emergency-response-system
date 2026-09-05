// frontend/src/pages/ReportIncidentPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import {
  EMERGENCY_PRIORITIES,
  EMERGENCY_PRIORITY_LABELS,
  EMERGENCY_TYPES,
  EMERGENCY_TYPE_LABELS,
} from '../utils/incident';

export default function ReportIncidentPage() {
  const navigate = useNavigate();

  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [locationLatitude, setLocationLatitude] = useState('');
  const [locationLongitude, setLocationLongitude] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [peopleAffected, setPeopleAffected] = useState('1');
  const [priority, setPriority] = useState('');
  const [citizenContactConsent, setCitizenContactConsent] = useState(false);
  const [issues, setIssues] = useState([]);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function validate() {
    const next = [];
    if (!type) {
      next.push('Please select an incident type.');
    }
    if (!description.trim()) {
      next.push('Please describe the emergency.');
    }
    const lat = Number(locationLatitude);
    if (locationLatitude === '' || !Number.isFinite(lat) || lat < -90 || lat > 90) {
      next.push('Latitude must be between -90 and 90.');
    }
    const lng = Number(locationLongitude);
    if (locationLongitude === '' || !Number.isFinite(lng) || lng < -180 || lng > 180) {
      next.push('Longitude must be between -180 and 180.');
    }
    const affected = Number(peopleAffected);
    if (!Number.isInteger(affected) || affected < 1) {
      next.push('People affected must be at least 1.');
    }
    return next;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    const nextIssues = validate();
    setIssues(nextIssues);
    if (nextIssues.length > 0) {
      return;
    }

    setSubmitting(true);
    try {
      await api.createIncident({
        type,
        description: description.trim(),
        locationLatitude: Number(locationLatitude),
        locationLongitude: Number(locationLongitude),
        locationAddress: locationAddress.trim() || null,
        peopleAffected: Number(peopleAffected),
        priority: priority || undefined,
        citizenContactConsent,
      });
      navigate('/incidents', { state: { reportedSuccess: true } });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    'w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none';

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-semibold text-slate-800">Report an emergency</h1>
      <p className="mb-6 text-sm text-slate-500">
        Provide as much detail as you can. The response team will use this to prioritise your report.
      </p>

      {issues.length > 0 && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          <ul className="list-inside list-disc space-y-1">
            {issues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="type" className="mb-1 block text-sm font-medium text-slate-700">
            Incident type
          </label>
          <select
            id="type"
            required
            value={type}
            onChange={(event) => setType(event.target.value)}
            className={inputClass}
          >
            <option value="">Select a type…</option>
            {EMERGENCY_TYPES.map((value) => (
              <option key={value} value={value}>
                {EMERGENCY_TYPE_LABELS[value]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="description" className="mb-1 block text-sm font-medium text-slate-700">
            Description
          </label>
          <textarea
            id="description"
            required
            rows={4}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className={inputClass}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="latitude" className="mb-1 block text-sm font-medium text-slate-700">
              Latitude
            </label>
            <input
              id="latitude"
              type="number"
              step="any"
              required
              value={locationLatitude}
              onChange={(event) => setLocationLatitude(event.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="longitude" className="mb-1 block text-sm font-medium text-slate-700">
              Longitude
            </label>
            <input
              id="longitude"
              type="number"
              step="any"
              required
              value={locationLongitude}
              onChange={(event) => setLocationLongitude(event.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="address" className="mb-1 block text-sm font-medium text-slate-700">
            Location address (optional)
          </label>
          <input
            id="address"
            type="text"
            value={locationAddress}
            onChange={(event) => setLocationAddress(event.target.value)}
            className={inputClass}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="peopleAffected" className="mb-1 block text-sm font-medium text-slate-700">
              People affected
            </label>
            <input
              id="peopleAffected"
              type="number"
              min="1"
              step="1"
              required
              value={peopleAffected}
              onChange={(event) => setPeopleAffected(event.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="priority" className="mb-1 block text-sm font-medium text-slate-700">
              Severity (optional)
            </label>
            <select
              id="priority"
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
              className={inputClass}
            >
              <option value="">No preference</option>
              {EMERGENCY_PRIORITIES.map((value) => (
                <option key={value} value={value}>
                  {EMERGENCY_PRIORITY_LABELS[value]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={citizenContactConsent}
            onChange={(event) => setCitizenContactConsent(event.target.checked)}
            className="mt-1"
          />
          <span>I agree to be contacted about this report if needed.</span>
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-blue-600 px-3 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Submitting report…' : 'Submit report'}
        </button>
      </form>
    </div>
  );
}