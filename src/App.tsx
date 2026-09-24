import React, { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import PageLoading from './components/ui/PageLoading'

// ── Auth ─────────────────────────────────────────────────────────────────────
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/auth/ProtectedRoute'
const Login = lazy(() => import('./pages/Auth/Login'))
const Signup = lazy(() => import('./pages/Auth/Signup'))
const Welcome = lazy(() => import('./pages/Auth/Welcome'))
const RoleSelect = lazy(() => import('./pages/Auth/RoleSelect'))

// ── Maintenance ──────────────────────────────────────────────────────────────
const Maintenance = lazy(() => import('./pages/Maintenance/Maintenance'))

// ── Core pages ───────────────────────────────────────────────────────────────
const Landing = lazy(() => import('./pages/Landing/Landing'))
const Marketplace = lazy(() => import('./pages/Marketplace/Marketplace'))
const ProjectDetail = lazy(() => import('./pages/ProjectDetail/ProjectDetail'))
const Ledger = lazy(() => import('./pages/Ledger/Ledger'))
const Profiles = lazy(() => import('./pages/Profiles/Profiles'))

// ── Individual flow ──────────────────────────────────────────────────────────
const IndividualLanding = lazy(() => import('./pages/IndividualLanding/IndividualLanding'))
const FundFlow = lazy(() => import('./pages/FundFlow/FundFlow'))
const ImpactHome = lazy(() => import('./pages/ImpactHome/ImpactHome'))

// ── Business pages ───────────────────────────────────────────────────────────
const Dashboard = lazy(() => import('./pages/Business/Dashboard'))
const EmissionsHub = lazy(() => import('./pages/Business/EmissionsHub'))
const SourceDataEntry = lazy(() => import('./pages/Business/SourceDataEntry'))
const BulkUpload = lazy(() => import('./pages/Business/BulkUpload'))
const Targets = lazy(() => import('./pages/Business/Targets'))
const Portfolio = lazy(() => import('./pages/Business/Portfolio'))
const BusinessFundFlow = lazy(() => import('./pages/Business/BusinessFundFlow'))
const ReportsCentre = lazy(() => import('./pages/Business/ReportsCentre'))
const ReportDetail = lazy(() => import('./pages/Business/ReportDetail'))
const PublicProfileSettings = lazy(() => import('./pages/Business/PublicProfileSettings'))
const Team = lazy(() => import('./pages/Business/Team'))
const OrgSettings = lazy(() => import('./pages/Business/OrgSettings'))
const BusinessToolkit = lazy(() => import('./pages/Business/BusinessToolkit'))

// ── Public profile ───────────────────────────────────────────────────────────
const PublicProfile = lazy(() => import('./pages/PublicProfile/PublicProfile'))

// ── Individual flow — new screens ────────────────────────────────────────────
const Confirmation = lazy(() => import('./pages/Confirmation/Confirmation'))
const MyProjects = lazy(() => import('./pages/MyProjects/MyProjects'))
const Certificate = lazy(() => import('./pages/Certificate/Certificate'))

// ── Project submission flow (C1–C4) ──────────────────────────────────────────
const SubmitProjectDetails = lazy(() => import('./pages/SubmitProject/SubmitProjectDetails'))
const AddPartner = lazy(() => import('./pages/SubmitProject/AddPartner'))
const AddEvidence = lazy(() => import('./pages/SubmitProject/AddEvidence'))
const ReviewSubmit = lazy(() => import('./pages/SubmitProject/ReviewSubmit'))
const BusinessProgramme = lazy(() => import('./pages/SubmitProject/BusinessProgramme'))

// ── Partner zone (P1–P10) ─────────────────────────────────────────────────────
const PartnerOnboarding = lazy(() => import('./pages/Partner/PartnerOnboarding'))
const PartnerDashboard = lazy(() => import('./pages/Partner/PartnerDashboard'))
const ProjectRegistration = lazy(() => import('./pages/Partner/ProjectRegistration'))
const LinkedSubmissions = lazy(() => import('./pages/Partner/LinkedSubmissions'))
const EvidenceVault = lazy(() => import('./pages/Partner/EvidenceVault'))
const SubmissionTracker = lazy(() => import('./pages/Partner/SubmissionTracker'))
const PartnerProjects = lazy(() => import('./pages/Partner/Projects'))
const AddTree = lazy(() => import('./pages/Partner/AddTree'))
const MyTrees = lazy(() => import('./pages/Partner/MyTrees'))
const ImportFunders = lazy(() => import('./pages/Partner/ImportFunders'))
const PartnerTasks = lazy(() => import('./pages/Partner/PartnerTasks'))
const FundersView = lazy(() => import('./pages/Partner/FundersView'))
const PartnerTeam = lazy(() => import('./pages/Partner/PartnerTeam'))
const PartnerUsers = lazy(() => import('./pages/Partner/PartnerUsers'))
const PartnerSettings = lazy(() => import('./pages/Partner/PartnerSettings'))

// ── Super Admin zone (A1–A10) ─────────────────────────────────────────────────
const ApprovalQueue = lazy(() => import('./pages/Admin/ApprovalQueue'))
const EvidenceReview = lazy(() => import('./pages/Admin/EvidenceReview'))
const PartnerManagement = lazy(() => import('./pages/Admin/PartnerManagement'))
const UsersAndTenants = lazy(() => import('./pages/Admin/UsersAndTenants'))
const SubmissionQueue = lazy(() => import('./pages/Admin/SubmissionQueue'))
const ProjectsOversight = lazy(() => import('./pages/Admin/ProjectsOversight'))
const DataQuality = lazy(() => import('./pages/Admin/DataQuality'))
const LedgerAdmin = lazy(() => import('./pages/Admin/LedgerAdmin'))
const FinanceConsole = lazy(() => import('./pages/Admin/FinanceConsole'))
const PlatformHealth = lazy(() => import('./pages/Admin/PlatformHealth'))
const Configuration = lazy(() => import('./pages/Admin/Configuration'))
const TreeRecords = lazy(() => import('./pages/Admin/TreeRecords'))
const TaskManagement = lazy(() => import('./pages/Admin/TaskManagement'))

export default function App(): React.JSX.Element {
  // AuthProvider wraps the entire app so useAuth() works everywhere
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={<PageLoading />}>
        <Routes>
          {/* ── Landing ── */}
          <Route path="/" element={<Landing />} />

          {/* ── Auth ── */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/maintenance" element={<Maintenance />} />
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
          <Route path="/partner/projects"     element={<ProtectedRoute allowedRoles={['partner']}><PartnerProjects /></ProtectedRoute>} />
          <Route path="/partner/projects/new" element={<ProtectedRoute allowedRoles={['partner']}><ProjectRegistration /></ProtectedRoute>} />
          <Route path="/partner/trees"        element={<ProtectedRoute allowedRoles={['partner']}><MyTrees /></ProtectedRoute>} />
          <Route path="/partner/trees/new"    element={<ProtectedRoute allowedRoles={['partner']}><AddTree /></ProtectedRoute>} />
          <Route path="/partner/funders/import" element={<ProtectedRoute allowedRoles={['partner']}><ImportFunders /></ProtectedRoute>} />
          {/* Field capture (P4) and the sync queue (P5) are mobile-app screens —
              /app/capture and /app/queue in the TreeApp. They are deliberately
              not served on the web: the offline guarantee depends on the device. */}
          <Route path="/partner/evidence"   element={<ProtectedRoute allowedRoles={['partner']}><EvidenceVault /></ProtectedRoute>} />
          <Route path="/partner/submissions" element={<ProtectedRoute allowedRoles={['partner']}><SubmissionTracker /></ProtectedRoute>} />
          <Route path="/partner/funders"    element={<ProtectedRoute allowedRoles={['partner']}><FundersView /></ProtectedRoute>} />
          <Route path="/partner/team"       element={<ProtectedRoute allowedRoles={['partner']}><PartnerTeam /></ProtectedRoute>} />
          <Route path="/partner/users"      element={<ProtectedRoute allowedRoles={['partner']}><PartnerUsers /></ProtectedRoute>} />
          <Route path="/partner/settings"          element={<ProtectedRoute allowedRoles={['partner']}><PartnerSettings /></ProtectedRoute>} />
          <Route path="/partner/linked-submissions" element={<ProtectedRoute allowedRoles={['partner']}><LinkedSubmissions /></ProtectedRoute>} />
          <Route path="/partner/tasks"       element={<ProtectedRoute allowedRoles={['partner']}><PartnerTasks /></ProtectedRoute>} />
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
          <Route path="/admin/tasks"        element={<ProtectedRoute allowedRoles={['admin']}><TaskManagement /></ProtectedRoute>} />
          <Route path="/admin/data-quality" element={<ProtectedRoute allowedRoles={['admin']}><DataQuality /></ProtectedRoute>} />
          <Route path="/admin/ledger"       element={<ProtectedRoute allowedRoles={['admin']}><LedgerAdmin /></ProtectedRoute>} />
          <Route path="/admin/finance"      element={<ProtectedRoute allowedRoles={['admin']}><FinanceConsole /></ProtectedRoute>} />
          <Route path="/admin/health"       element={<ProtectedRoute allowedRoles={['admin']}><PlatformHealth /></ProtectedRoute>} />
          <Route path="/admin/config"       element={<ProtectedRoute allowedRoles={['admin']}><Configuration /></ProtectedRoute>} />
          <Route path="/admin/tree-records" element={<ProtectedRoute allowedRoles={['admin']}><TreeRecords /></ProtectedRoute>} />

          {/* ── Fallback ── */}
          <Route path="*" element={<Landing />} />
        </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  )
}