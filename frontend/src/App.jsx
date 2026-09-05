// frontend/src/App.jsx
import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import HomeRedirect from './components/HomeRedirect';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardPage from './pages/DashboardPage';
import IncidentDetailPage from './pages/IncidentDetailPage';
import LoginPage from './pages/LoginPage';
import MyIncidentsPage from './pages/MyIncidentsPage';
import OperatorDashboardPage from './pages/OperatorDashboardPage';
import OperatorIncidentDetailPage from './pages/OperatorIncidentDetailPage';
import OperatorIncidentListPage from './pages/OperatorIncidentListPage';
import OperatorAuditLogPage from './pages/OperatorAuditLogPage';
import OperatorRespondersPage from './pages/OperatorRespondersPage';
import RegisterPage from './pages/RegisterPage';
import ReportIncidentPage from './pages/ReportIncidentPage';
import ResponderAssignmentDetailPage from './pages/ResponderAssignmentDetailPage';
import ResponderAssignmentsPage from './pages/ResponderAssignmentsPage';
import ResponderDashboardPage from './pages/ResponderDashboardPage';
import SosPage from './pages/SosPage';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/sos" element={<SosPage />} />
          <Route path="/report-incident" element={<ReportIncidentPage />} />
          <Route path="/incidents" element={<MyIncidentsPage />} />
          <Route path="/incidents/:id" element={<IncidentDetailPage />} />
        </Route>
        <Route element={<ProtectedRoute roles={['OPERATOR']} />}>
          <Route path="/operator" element={<OperatorDashboardPage />} />
          <Route path="/operator/incidents" element={<OperatorIncidentListPage />} />
          <Route path="/operator/incidents/:id" element={<OperatorIncidentDetailPage />} />
          <Route path="/operator/responders" element={<OperatorRespondersPage />} />
        </Route>
        <Route element={<ProtectedRoute roles={['OPERATOR', 'ADMIN']} />}>
          <Route path="/audit" element={<OperatorAuditLogPage />} />
        </Route>
        <Route element={<ProtectedRoute roles={['RESPONDER']} />}>
          <Route path="/responder" element={<ResponderDashboardPage />} />
          <Route path="/responder/assignments" element={<ResponderAssignmentsPage />} />
          <Route path="/responder/assignments/:id" element={<ResponderAssignmentDetailPage />} />
        </Route>
        <Route path="/" element={<HomeRedirect />} />
        <Route path="*" element={<HomeRedirect />} />
      </Route>
    </Routes>
  );
}