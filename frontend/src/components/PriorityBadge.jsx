// frontend/src/components/PriorityBadge.jsx
import { EMERGENCY_PRIORITY_LABELS } from '../utils/incident';

const STYLES = {
  CRITICAL: 'bg-red-100 text-red-800 ring-red-200',
  HIGH: 'bg-orange-100 text-orange-800 ring-orange-200',
  MEDIUM: 'bg-amber-100 text-amber-800 ring-amber-200',
  LOW: 'bg-slate-100 text-slate-600 ring-slate-200',
};

export default function PriorityBadge({ priority }) {
  return (
    <span
      className={`inline-flex rounded px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ${
        STYLES[priority] || 'bg-slate-100 text-slate-600 ring-slate-200'
      }`}
    >
      {EMERGENCY_PRIORITY_LABELS[priority] || priority}
    </span>
  );
}