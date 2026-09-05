// frontend/src/components/AiSuggestionPanel.jsx
// OPERATOR-only AI decision-support panel. Advisory only — the UI always states
// the result is an AI suggestion requiring human review. Supports re-suggest,
// accept, and explicit override (operator-selected category/priority).
import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import { EMERGENCY_PRIORITY_LABELS, EMERGENCY_PRIORITIES, EMERGENCY_TYPE_LABELS, EMERGENCY_TYPES, formatDate } from '../utils/incident';

function confidencePercent(confidence) {
  if (typeof confidence !== 'number') {
    return '—';
  }
  return `${Math.round(confidence * 100)}%`;
}

export default function AiSuggestionPanel({ incidentId, incident, onUpdated }) {
  const [suggestion, setSuggestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [categorySel, setCategorySel] = useState('');
  const [prioritySel, setPrioritySel] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    try {
      const { data } = await api.incidentAi(incidentId);
      setSuggestion(data);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [incidentId]);

  useEffect(() => {
    load();
  }, [load]);

  async function runAction(action, payload) {
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const { data } = await action();
      setSuggestion(data);
      setOverrideOpen(false);
      setMessage(payload || 'Updated.');
      if (onUpdated) {
        onUpdated();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function openOverride() {
    setCategorySel(incident?.type || '');
    setPrioritySel(incident?.priority || '');
    setOverrideOpen(true);
  }

  const hasSuggestion =
    suggestion && (suggestion.category || suggestion.priority || suggestion.processedAt);

  return (
    <div className="rounded-lg border border-indigo-200 bg-indigo-50/40 p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-medium uppercase tracking-wide text-indigo-500">
          AI triage suggestion
        </h2>
        {hasSuggestion && (
          <span className="rounded bg-indigo-600 px-2 py-0.5 text-xs font-medium text-white">
            AI suggestion — requires operator review
          </span>
        )}
      </div>

      <p className="mt-1 text-xs text-slate-500">
        Advisory decision support only. Human operators remain responsible for final
        category and priority decisions.
      </p>

      {error && (
        <div className="mt-3 rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {message && (
        <div className="mt-3 rounded-md border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800">
          {message}
        </div>
      )}

      {loading ? (
        <p className="mt-3 text-sm text-slate-500">Loading AI suggestion…</p>
      ) : suggestion && suggestion.processedAt ? (
        <div className="mt-3">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Suggested category
              </dt>
              <dd className="mt-0.5 text-sm font-medium text-slate-800">
                {suggestion.category
                  ? EMERGENCY_TYPE_LABELS[suggestion.category] || suggestion.category
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Suggested priority
              </dt>
              <dd className="mt-0.5 text-sm font-medium text-slate-800">
                {suggestion.priority
                  ? EMERGENCY_PRIORITY_LABELS[suggestion.priority] || suggestion.priority
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
                Confidence
              </dt>
              <dd className="mt-0.5 text-sm font-medium text-slate-800">
                {confidencePercent(suggestion.confidence)}
              </dd>
            </div>
          </dl>

          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full bg-indigo-500"
              style={{
                width: `${Math.max(0, Math.min(100, Math.round((suggestion.confidence || 0) * 100)))}%`,
              }}
            />
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Processed {formatDate(suggestion.processedAt)}
            {suggestion.overridden
              ? ' · Overridden by operator'
              : ' · AI suggestion stands (not overridden)'}
          </p>

          <div className="mt-4">
            <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400">
              Matched signals
            </h3>
            {suggestion.signals.length === 0 ? (
              <p className="mt-1 text-sm text-slate-500">No explainable signals available.</p>
            ) : (
              <ul className="mt-1 flex flex-wrap gap-2">
                {suggestion.signals.map((signal) => (
                  <li
                    key={signal}
                    className="rounded-md border border-indigo-200 bg-white px-2 py-1 text-xs text-slate-600"
                  >
                    {signal}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => runAction(() => api.acceptAiSuggestion(incidentId), 'AI suggestion accepted and applied.')}
              className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? 'Applying…' : 'Accept suggestion'}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => runAction(() => api.reSuggestIncident(incidentId), 'AI suggestion re-run.')}
              className="rounded-md border border-indigo-300 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Re-suggest
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={openOverride}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Override
            </button>
          </div>

          {overrideOpen && (
            <div className="mt-4 rounded-md border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-medium text-slate-800">Override AI suggestion</h3>
              <p className="mt-1 text-xs text-slate-500">
                Select your own category/priority. The AI suggestion is preserved; this decision
                is recorded as an override.
              </p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="block text-sm">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Category
                  </span>
                  <select
                    value={categorySel}
                    onChange={(event) => setCategorySel(event.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Keep current</option>
                    {EMERGENCY_TYPES.map((value) => (
                      <option key={value} value={value}>
                        {EMERGENCY_TYPE_LABELS[value]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    Priority
                  </span>
                  <select
                    value={prioritySel}
                    onChange={(event) => setPrioritySel(event.target.value)}
                    className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Keep current</option>
                    {[...EMERGENCY_PRIORITIES].reverse().map((value) => (
                      <option key={value} value={value}>
                        {EMERGENCY_PRIORITY_LABELS[value]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="mt-3 flex gap-3">
                <button
                  type="button"
                  disabled={busy || (!categorySel && !prioritySel)}
                  onClick={() =>
                    runAction(
                      () =>
                        api.overrideAiSuggestion(incidentId, {
                          ...(categorySel ? { category: categorySel } : {}),
                          ...(prioritySel ? { priority: prioritySel } : {}),
                        }),
                      'Override applied.'
                    )
                  }
                  className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {busy ? 'Applying…' : 'Apply override'}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setOverrideOpen(false)}
                  className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-3">
          <p className="text-sm text-slate-600">
            No AI suggestion has been generated for this incident yet.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => runAction(() => api.reSuggestIncident(incidentId), 'AI suggestion generated.')}
            className="mt-3 rounded-md border border-indigo-300 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? 'Generating…' : 'Generate AI suggestion'}
          </button>
        </div>
      )}
    </div>
  );
}