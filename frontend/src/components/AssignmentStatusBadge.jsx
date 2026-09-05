// frontend/src/components/AssignmentStatusBadge.jsx
const META = {
  PENDING: { label: 'Pending', className: 'bg-slate-100 text-slate-700' },
  ACCEPTED: { label: 'Accepted', className: 'bg-blue-100 text-blue-700' },
  REJECTED: { label: 'Rejected', className: 'bg-red-100 text-red-700' },
  EN_ROUTE: { label: 'En route', className: 'bg-orange-100 text-orange-700' },
  ARRIVED: { label: 'Arrived', className: 'bg-orange-200 text-orange-800' },
  COMPLETED: { label: 'Completed', className: 'bg-green-100 text-green-700' },
  CANCELLED: { label: 'Cancelled', className: 'bg-red-100 text-red-700' },
};

export default function AssignmentStatusBadge({ status }) {
  const meta = META[status] || { label: status, className: 'bg-slate-100 text-slate-600' };
  return (
    <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${meta.className}`}>
      {meta.label}
    </span>
  );
}