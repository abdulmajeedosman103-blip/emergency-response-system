// frontend/src/components/SosButton.jsx
// Prominent, deliberate-entry point to the SOS flow.
import { Link } from 'react-router-dom';

export default function SosButton({ label = 'SOS', className = '' }) {
  return (
    <Link
      to="/sos"
      className={`rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-300 ${className}`}
    >
      {label}
    </Link>
  );
}