import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'

// ── Auth ─────────────────────────────────────────────────────────────────────
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/auth/ProtectedRoute'
import Login from './pages/Auth/Login'
import Signup from './pages/Auth/Signup'
import Welcome from './pages/Auth/Welcome'
import RoleSelect from './pages/Auth/RoleSelect'

// ── Core pages ───────────────────────────────────────────────────────────────
import Landing from './pages/Landing/Landing'
import Marketplace from './pages/Marketplace/Marketplace'
import ProjectDetail from './pages/ProjectDetail/ProjectDetail'
import Ledger from './pages/Ledger/Ledger'
import Profiles from './pages/Profiles/Profiles'

// ── Individual flow ──────────────────────────────────────────────────────────
import IndividualLanding from './pages/IndividualLanding/IndividualLanding'
import FundFlow from './pages/FundFlow/FundFlow'
import ImpactHome from './pages/ImpactHome/ImpactHome'

// ── Business pages ───────────────────────────────────────────────────────────
import Dashboard from './pages/Business/Dashboard'
import EmissionsHub from './pages/Business/EmissionsHub'
import SourceDataEntry from './pages/Business/SourceDataEntry'
import BulkUpload from './pages/Business/BulkUpload'
import Targets from './pages/Business/Targets'
import Portfolio from './pages/Business/Portfolio'
import BusinessFundFlow from './pages/Business/BusinessFundFlow'
import ReportsCentre from './pages/Business/ReportsCentre'
import ReportDetail from './pages/Business/ReportDetail'
import PublicProfileSettings from './pages/Business/PublicProfileSettings'
import Team from './pages/Business/Team'
import OrgSettings from './pages/Business/OrgSettings'
import BusinessToolkit from './pages/Business/BusinessToolkit'

// ── Public profile ───────────────────────────────────────────────────────────
import PublicProfile from './pages/PublicProfile/PublicProfile'

// ── Individual flow — new screens ────────────────────────────────────────────
import Confirmation from './pages/Confirmation/Confirmation'
import MyProjects   from './pages/MyProjects/MyProjects'
import Certificate  from './pages/Certificate/Certificate'

// ── Project submission flow (C1–C4) ──────────────────────────────────────────
import SubmitProjectDetails from './pages/SubmitProject/SubmitProjectDetails'
import AddPartner           from './pages/SubmitProject/AddPartner'
import AddEvidence          from './pages/SubmitProject/AddEvidence'
import ReviewSubmit         from './pages/SubmitProject/ReviewSubmit'
import BusinessProgramme   from './pages/SubmitProject/BusinessProgramme'

// ── Partner zone (P1–P10) ─────────────────────────────────────────────────────
import PartnerOnboarding    from './pages/Partner/PartnerOnboarding'
import PartnerDashboard     from './pages/Partner/PartnerDashboard'
import ProjectRegistration  from './pages/Partner/ProjectRegistration'
import LinkedSubmissions    from './pages/Partner/LinkedSubmissions'
import FieldCapture         from './pages/Partner/FieldCapture'
import SyncQueue            from './pages/Partner/SyncQueue'
import EvidenceVault        from './pages/Partner/EvidenceVault'
import SubmissionTracker    from './pages/Partner/SubmissionTracker'
import FundersView          from './pages/Partner/FundersView'
import PartnerTeam          from './pages/Partner/PartnerTeam'
import PartnerSettings      from './pages/Partner/PartnerSettings'

// ── Super Admin zone (A1–A10) ─────────────────────────────────────────────────
import ApprovalQueue        from './pages/Admin/ApprovalQueue'
import EvidenceReview       from './pages/Admin/EvidenceReview'
import PartnerManagement    from './pages/Admin/PartnerManagement'
import UsersAndTenants      from './pages/Admin/UsersAndTenants'
import SubmissionQueue      from './pages/Admin/SubmissionQueue'
import ProjectsOversight    from './pages/Admin/ProjectsOversight'
import DataQuality          from './pages/Admin/DataQuality'
import LedgerAdmin          from './pages/Admin/LedgerAdmin'
import FinanceConsole       from './pages/Admin/FinanceConsole'
import PlatformHealth       from './pages/Admin/PlatformHealth'
import Configuration        from './pages/Admin/Configuration'

export default function App(): React.JSX.Element {
  // AuthProvider wraps the entire app so useAuth() works everywhere
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* ── Landing ── */}
          <Route path="/" element={<Landing />} />

          {/* ── Auth ── */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/welcome" element={<ProtectedRoute><Welcome /></ProtectedRoute>} />
          <Route path="/role-select" element={<ProtectedRoute><RoleSelect /></ProtectedRoute>} />

          {/* ── Business info (public — for unauthenticated business users) ── */}
          <Route path="/business-info" element={<IndividualLanding />} />

          {/* ── Individual flow (public pages) ── */}
          <Route path="/individual" element={<IndividualLanding />} />

          {/* ── Individual flow (protected) ── */}
          <Route path="/fund" element={<ProtectedRoute allowedRoles={['individual']}><FundFlow /></ProtectedRoute>} />
          <Route path="/impact" element={<ProtectedRoute allowedRoles={['individual']}><ImpactHome /></ProtectedRoute>} />
          <Route path="/confirmation" element={<ProtectedRoute allowedRoles={['individual']}><Confirmation /></ProtectedRoute>} />
          <Route path="/my-projects" element={<ProtectedRoute allowedRoles={['individual']}><MyProjects /></ProtectedRoute>} />
          <Route path="/certificate/:id" element={<ProtectedRoute allowedRoles={['individual']}><Certificate /></ProtectedRoute>} />

          {/* ── Project submission flow C1–C4 (protected — individual + business) ── */}
          <Route path="/submit-project/details"  element={<ProtectedRoute><SubmitProjectDetails /></ProtectedRoute>} />
          <Route path="/submit-project/partner"  element={<ProtectedRoute><AddPartner /></ProtectedRoute>} />
          <Route path="/submit-project/evidence" element={<ProtectedRoute><AddEvidence /></ProtectedRoute>} />
          <Route path="/submit-project/review"      element={<ProtectedRoute><ReviewSubmit /></ProtectedRoute>} />
          <Route path="/submit-project/programme"   element={<ProtectedRoute><BusinessProgramme /></ProtectedRoute>} />
          {/* Redirect bare /submit-project to first step */}
          <Route path="/submit-project" element={<ProtectedRoute><SubmitProjectDetails /></ProtectedRoute>} />

          {/* ── Project marketplace (public) ── */}
          <Route path="/projects" element={<Marketplace />} />
          <Route path="/projects/:id" element={<ProjectDetail />} />

          {/* ── Public ledger (public) ── */}
          <Route path="/ledger" element={<Ledger />} />

          {/* ── Profiles (public) ── */}
          <Route path="/profiles" element={<Profiles />} />
          <Route path="/profile/:id" element={<PublicProfile />} />

          {/* ── Business (protected) ── */}
          <Route path="/business" element={<ProtectedRoute allowedRoles={['business']}><Dashboard /></ProtectedRoute>} />
          <Route path="/business/emissions" element={<ProtectedRoute allowedRoles={['business']}><EmissionsHub /></ProtectedRoute>} />
          <Route path="/business/source-data" element={<ProtectedRoute allowedRoles={['business']}><SourceDataEntry /></ProtectedRoute>} />
          <Route path="/business/bulk-upload" element={<ProtectedRoute allowedRoles={['business']}><BulkUpload /></ProtectedRoute>} />
          <Route path="/business/targets" element={<ProtectedRoute allowedRoles={['business']}><Targets /></ProtectedRoute>} />
          <Route path="/business/portfolio" element={<ProtectedRoute allowedRoles={['business']}><Portfolio /></ProtectedRoute>} />
          <Route path="/business/fund" element={<ProtectedRoute allowedRoles={['business']}><BusinessFundFlow /></ProtectedRoute>} />
          <Route path="/business/reports" element={<ProtectedRoute allowedRoles={['business']}><ReportsCentre /></ProtectedRoute>} />
          <Route path="/business/reports/:id" element={<ProtectedRoute allowedRoles={['business']}><ReportDetail /></ProtectedRoute>} />
          <Route path="/business/public-profile" element={<ProtectedRoute allowedRoles={['business']}><PublicProfileSettings /></ProtectedRoute>} />
          <Route path="/business/team" element={<ProtectedRoute allowedRoles={['business']}><Team /></ProtectedRoute>} />
          <Route path="/business/settings" element={<ProtectedRoute allowedRoles={['business']}><OrgSettings /></ProtectedRoute>} />
          <Route path="/business/toolkit" element={<ProtectedRoute allowedRoles={['business']}><BusinessToolkit /></ProtectedRoute>} />

          {/* ── Partner zone (P1–P10, protected) ── */}
          <Route path="/partner/onboarding" element={<ProtectedRoute allowedRoles={['partner']}><PartnerOnboarding /></ProtectedRoute>} />
          <Route path="/partner/dashboard"  element={<ProtectedRoute allowedRoles={['partner']}><PartnerDashboard /></ProtectedRoute>} />
          <Route path="/partner/projects/new" element={<ProtectedRoute allowedRoles={['partner']}><ProjectRegistration /></ProtectedRoute>} />
          <Route path="/partner/field"      element={<ProtectedRoute allowedRoles={['partner']}><FieldCapture /></ProtectedRoute>} />
          <Route path="/partner/sync"       element={<ProtectedRoute allowedRoles={['partner']}><SyncQueue /></ProtectedRoute>} />
          <Route path="/partner/evidence"   element={<ProtectedRoute allowedRoles={['partner']}><EvidenceVault /></ProtectedRoute>} />
          <Route path="/partner/submissions" element={<ProtectedRoute allowedRoles={['partner']}><SubmissionTracker /></ProtectedRoute>} />
          <Route path="/partner/funders"    element={<ProtectedRoute allowedRoles={['partner']}><FundersView /></ProtectedRoute>} />
          <Route path="/partner/team"       element={<ProtectedRoute allowedRoles={['partner']}><PartnerTeam /></ProtectedRoute>} />
          <Route path="/partner/settings"          element={<ProtectedRoute allowedRoles={['partner']}><PartnerSettings /></ProtectedRoute>} />
          <Route path="/partner/linked-submissions" element={<ProtectedRoute allowedRoles={['partner']}><LinkedSubmissions /></ProtectedRoute>} />
          {/* Redirect bare /partner to dashboard */}
          <Route path="/partner" element={<ProtectedRoute allowedRoles={['partner']}><PartnerDashboard /></ProtectedRoute>} />

          {/* ── Super Admin zone (A1–A10, protected — admin role only) ── */}
          <Route path="/admin"                  element={<ProtectedRoute allowedRoles={['admin']}><ApprovalQueue /></ProtectedRoute>} />
          <Route path="/admin/submissions"      element={<ProtectedRoute allowedRoles={['admin']}><SubmissionQueue /></ProtectedRoute>} />
          <Route path="/admin/evidence"         element={<ProtectedRoute allowedRoles={['admin']}><EvidenceReview /></ProtectedRoute>} />
          <Route path="/admin/evidence/:id"     element={<ProtectedRoute allowedRoles={['admin']}><EvidenceReview /></ProtectedRoute>} />
          <Route path="/admin/partners"         element={<ProtectedRoute allowedRoles={['admin']}><PartnerManagement /></ProtectedRoute>} />
          <Route path="/admin/users"        element={<ProtectedRoute allowedRoles={['admin']}><UsersAndTenants /></ProtectedRoute>} />
          <Route path="/admin/projects"     element={<ProtectedRoute allowedRoles={['admin']}><ProjectsOversight /></ProtectedRoute>} />
          <Route path="/admin/data-quality" element={<ProtectedRoute allowedRoles={['admin']}><DataQuality /></ProtectedRoute>} />
          <Route path="/admin/ledger"       element={<ProtectedRoute allowedRoles={['admin']}><LedgerAdmin /></ProtectedRoute>} />
          <Route path="/admin/finance"      element={<ProtectedRoute allowedRoles={['admin']}><FinanceConsole /></ProtectedRoute>} />
          <Route path="/admin/health"       element={<ProtectedRoute allowedRoles={['admin']}><PlatformHealth /></ProtectedRoute>} />
          <Route path="/admin/config"       element={<ProtectedRoute allowedRoles={['admin']}><Configuration /></ProtectedRoute>} />

          {/* ── Fallback ── */}
          <Route path="*" element={<Landing />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}