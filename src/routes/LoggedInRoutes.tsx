import { Navigate, Route, Routes } from 'react-router-dom'
import { DashboardShell } from '@/components/DashboardShell'
import { AppointmentsPage } from '@/pages/AppointmentsPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { InvoicesPage } from '@/pages/InvoicesPage'
import { PatientDetailPage } from '@/pages/PatientDetailPage'
import { PatientsPage } from '@/pages/PatientsPage'
import { SettingsPage } from '@/pages/SettingsPage'
import { CashboxPage } from '@/pages/CashboxPage'
import { ReportsPage } from '@/pages/ReportsPage'
import { DentalLabPage } from '@/pages/DentalLabPage'
import { DistributorsPage } from '@/pages/DistributorsPage'
import { AboutPage } from '@/pages/AboutPage'
import { AskMePage } from '@/pages/AskMePage'
import { useSessionStore } from '@/stores/sessionStore'

function RoleHome() {
  const user = useSessionStore((s) => s.user)
  if (user?.role === 'receptionist') return <Navigate to="/appointments" replace />
  return <Navigate to="/dashboard" replace />
}

export function LoggedInRoutes() {
  return (
    <Routes>
      <Route path="/" element={<DashboardShell />}>
        <Route index element={<RoleHome />} />
        <Route path="dashboard" element={<DashboardPage />} />
        <Route path="patients" element={<PatientsPage />} />
        <Route path="patients/new" element={<PatientDetailPage />} />
        <Route path="patients/:id" element={<PatientDetailPage />} />
        <Route path="appointments" element={<AppointmentsPage />} />
        <Route path="cashbox" element={<CashboxPage />} />
        <Route path="invoices" element={<InvoicesPage />} />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="dental-lab" element={<DentalLabPage />} />
        <Route path="distributors" element={<DistributorsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="ask-me" element={<AskMePage />} />
        <Route path="about" element={<AboutPage />} />
      </Route>
    </Routes>
  )
}
