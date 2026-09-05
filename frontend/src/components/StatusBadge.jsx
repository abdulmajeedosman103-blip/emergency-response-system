// frontend/src/components/StatusBadge.jsx
const STATUS_META = {
  REPORTED: { label: 'Reported', className: 'bg-slate-100 text-slate-700' },
  VERIFIED: { label: 'Verified', className: 'bg-blue-100 text-blue-700' },
  RESPONDER_ASSIGNED: { label: 'Responder assigned', className: 'bg-amber-100 text-amber-700' },
  RESPONDER_EN_ROUTE: { label: 'Responder en route', className: 'bg-orange-100 text-orange-700' },
  RESPONDER_ARRIVED: { label: 'Responder arrived', className: 'bg-orange-200 text-orange-800' },
  RESOLVED: { label: 'Resolved', className: 'bg-green-100 text-green-700' },
  CANCELLED: { label: 'Cancelled', className: 'bg-red-100 text-red-700' },
};

export default function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: status, className: 'bg-slate-100 text-slate-600' };
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${meta.className}`}>
      {meta.label}
    </span>
  );
}