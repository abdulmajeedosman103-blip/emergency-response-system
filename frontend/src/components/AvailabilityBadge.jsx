// frontend/src/components/AvailabilityBadge.jsx
const META = {
  AVAILABLE: { label: 'Available', className: 'bg-green-100 text-green-700' },
  BUSY: { label: 'Busy', className: 'bg-amber-100 text-amber-700' },
  OFFLINE: { label: 'Offline', className: 'bg-slate-100 text-slate-600' },
};

export default function AvailabilityBadge({ availability }) {
  const meta = META[availability] || { label: availability, className: 'bg-slate-100 text-slate-600' };
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${meta.className}`}>
      {meta.label}
    </span>
  );
}