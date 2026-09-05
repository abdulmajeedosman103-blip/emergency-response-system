// frontend/src/pages/SosPage.jsx
// One-time emergency SOS flow: warning → location capture → deliberate send.
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { EMERGENCY_TYPES, EMERGENCY_TYPE_LABELS } from '../utils/incident';

const LOCATION_OPTIONS = { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 };

export default function SosPage() {
  const navigate = useNavigate();

  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const [locationAddress, setLocationAddress] = useState('');

  const [locationStatus, setLocationStatus] = useState('idle'); // idle | locating | success | error
  const [locationError, setLocationError] = useState('');
  const [autoLat, setAutoLat] = useState(null);
  const [autoLng, setAutoLng] = useState(null);
  const [autoAccuracy, setAutoAccuracy] = useState(null);

  const [manualLat, setManualLat] = useState('');
  const [manualLng, setManualLng] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const latitude = autoLat !== null ? autoLat : Number(manualLat);
  const longitude = autoLng !== null ? autoLng : Number(manualLng);
  const hasValidCoordinates =
    Number.isFinite(latitude) && latitude >= -90 && latitude <= 90 &&
    Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;

  function requestLocation() {
    if (locationStatus === 'locating') {
      return;
    }
    setLocationStatus('locating');
    setLocationError('');
    setError('');

    if (!('geolocation' in navigator)) {
      setLocationStatus('error');
      setLocationError('Geolocation is not supported by this browser. Enter your coordinates manually below.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setAutoLat(position.coords.latitude);
        setAutoLng(position.coords.longitude);
        setAutoAccuracy(Math.round(position.coords.accuracy));
        setLocationStatus('success');
      },
      (err) => {
        let message = 'Could not retrieve your location.';
        if (err.code === err.PERMISSION_DENIED) {
          message = 'Location permission was denied. You can enter your coordinates manually below.';
        } else if (err.code === err.TIMEOUT) {
          message = 'Location request timed out. Please try again or enter your coordinates manually.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          message = 'Your location is currently unavailable. Enter your coordinates manually below.';
        }
        setAutoLat(null);
        setAutoLng(null);
        setAutoAccuracy(null);
        setLocationStatus('error');
        setLocationError(message);
      },
      LOCATION_OPTIONS,
    );
  }

  function clearAutoLocation() {
    setAutoLat(null);
    setAutoLng(null);
    setAutoAccuracy(null);
    setLocationStatus('idle');
  }

  async function handleSend(event) {
    event.preventDefault();
    setError('');

    if (!hasValidCoordinates) {
      setError('A valid location is required. Use your current location or enter coordinates manually.');
      return;
    }
    if (submitting) {
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.sendSos({
        type: type || undefined,
        description: description.trim() || undefined,
        locationAddress: locationAddress.trim() || undefined,
        locationLatitude: latitude,
        locationLongitude: longitude,
      });
      navigate(`/incidents/${data.id}`, { state: { sosSuccess: true } });
    } catch (err) {
      if (err.status === 429) {
        setError(`${err.message} Please wait a moment before trying again.`);
      } else {
        setError(err.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    'w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900 focus:border-red-500 focus:outline-none';

  return (
    <div className="mx-auto max-w-xl">
      <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4">
        <h1 className="text-xl font-semibold text-red-800">Emergency SOS</h1>
        <p className="mt-1 text-sm text-red-700">
          Use this only for a <strong>real emergency</strong> in which you need help immediately.
          An alert will be created at your location with the highest severity.
        </p>
      </div>

      <form onSubmit={handleSend} className="mt-6 space-y-5">
        <div>
          <label htmlFor="sos-type" className="mb-1 block text-sm font-medium text-slate-700">
            Type of emergency (optional)
          </label>
          <select id="sos-type" value={type} onChange={(event) => setType(event.target.value)} className={inputClass}>
            <option value="">Not sure / other</option>
            {EMERGENCY_TYPES.map((value) => (
              <option key={value} value={value}>
                {EMERGENCY_TYPE_LABELS[value]}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-2 text-sm font-medium text-slate-700">Your location</h2>

          {locationStatus === 'success' && (
            <div className="mb-3 rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-700">
              Location captured: {autoLat.toFixed(5)}, {autoLng.toFixed(5)} (±{autoAccuracy} m){' '}
              <button type="button" onClick={clearAutoLocation} className="underline hover:no-underline">
                clear
              </button>
            </div>
          )}

          {locationStatus === 'error' && (
            <div className="mb-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              {locationError}
            </div>
          )}

          <button
            type="button"
            onClick={requestLocation}
            disabled={locationStatus === 'locating' || locationStatus === 'success'}
            className="w-full rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-white hover:bg-slate-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {locationStatus === 'locating' ? 'Getting your location…' : 'Use my current location'}
          </button>

          <div className="my-4 flex items-center gap-3 text-xs text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            or enter coordinates manually
            <span className="h-px flex-1 bg-slate-200" />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="sos-lat" className="mb-1 block text-sm font-medium text-slate-700">
                Latitude
              </label>
              <input
                id="sos-lat"
                type="number"
                step="any"
                min="-90"
                max="90"
                value={manualLat}
                onChange={(event) => {
                  setManualLat(event.target.value);
                  if (autoLat !== null) {
                    clearAutoLocation();
                  }
                }}
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="sos-lng" className="mb-1 block text-sm font-medium text-slate-700">
                Longitude
              </label>
              <input
                id="sos-lng"
                type="number"
                step="any"
                min="-180"
                max="180"
                value={manualLng}
                onChange={(event) => {
                  setManualLng(event.target.value);
                  if (autoLng !== null) {
                    clearAutoLocation();
                  }
                }}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="sos-address" className="mb-1 block text-sm font-medium text-slate-700">
            Landmark / address (optional)
          </label>
          <input
            id="sos-address"
            type="text"
            value={locationAddress}
            onChange={(event) => setLocationAddress(event.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="sos-desc" className="mb-1 block text-sm font-medium text-slate-700">
            Note to responders (optional)
          </label>
          <textarea
            id="sos-desc"
            rows={2}
            maxLength={500}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className={inputClass}
          />
        </div>

        {error && (
          <div role="alert" className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-md bg-red-600 px-3 py-3 text-base font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? 'Sending SOS…' : 'Send SOS alert'}
        </button>
      </form>
    </div>
  );
}