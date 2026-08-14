// ── Project ───────────────────────────────────────────────────────────────────
export type Element = 'earth' | 'water' | 'fire' | 'air' | 'ether'
export type ProjectStatus = 'active' | 'paused' | 'completed' | 'draft'
export type Certification = 'Gold Standard' | 'Verra VCS' | 'Plan Vivo' | string

export interface Project {
  id: string
  slug: string
  name: string
  element: Element
  category: string
  location: string
  country: string
  partner: string
  certification: Certification
  certificationId: string
  pricePerTree: number
  totalTrees: number
  fundedTrees: number
  fundersCount: number
  lastEvidenceDate: string | null
  evidenceCount: number
  tCO2e: number
  description: string
  verified: boolean
  status: ProjectStatus
  createdAt: string
  coverImage?: string | null
  // Optional extended fields used in ProjectDetail
  evidenceEntries?: EvidenceEntry[]
  evidenceLocations?: Array<{ lat: number; lng: number; label: string }>
  funders?: Array<{ name: string; trees: number; date: string }>
  lastEvidence?: string | null
}

export interface ProjectsResponse {
  data: Project[]
  count: number
}

// ── Evidence ──────────────────────────────────────────────────────────────────
export interface EvidenceEntry {
  id: string
  projectId: string
  date: string
  photoUrl: string | null
  lat: number | null
  lng: number | null
  species: string | null
  treeCount: number
  txHash: string | null
  verified: boolean
}

// ── Ledger ────────────────────────────────────────────────────────────────────
export interface LedgerEntry {
  id: string
  date: string
  project: string
  funder: string
  trees: number
  tCO2e: number
  txHash: string
  verified: boolean
}

// ── Profile ───────────────────────────────────────────────────────────────────
export type ProfileType = 'individual' | 'organisation'

export interface Profile {
  id: string
  name: string
  type: ProfileType
  location: string
  trees: number
  tCO2e: number
  avatar: string
  projects?: number
  elements?: number
}

// ── Footprint estimator ───────────────────────────────────────────────────────
export type ActivityKey = 'flight' | 'car' | 'homeEnergy' | 'diet'

export interface FootprintResult {
  activity: ActivityKey
  tCO2e: number
  answers: Record<string, string>
}

// ── Fund flow ─────────────────────────────────────────────────────────────────
export type FundFlowState =
  | 'withFootprint'
  | 'withoutFootprint'
  | 'unauthenticated'
  | 'processing'
  | 'declined'
  | 'filled'

// ── Business ──────────────────────────────────────────────────────────────────
export type ScopeType = 1 | 2 | 3
export type ReportStatus = 'draft' | 'final' | 'superseded'
export type TargetType = 'Absolute' | 'Intensity' | 'SBTi'
export type EmissionsState = 'behind' | 'onTrack' | 'ahead'

export interface EmissionsSource {
  id: string
  name: string
  scope: ScopeType
  category: string
  value: number
  unit: string
  factor: number
  tCO2e: number
  status: 'complete' | 'estimated' | 'missing'
}

export interface Report {
  id: string
  version: number
  type: string
  period: string
  status: ReportStatus
  generatedBy: string
  date: string
  downloadUrl: string | null
}

export interface TeamMember {
  id: string
  name: string
  email: string
  role: 'Admin' | 'Member'
  department: string
  lastActive: string
  status: 'active' | 'pending'
  initials: string
  protected?: boolean
}

// ── API helpers ───────────────────────────────────────────────────────────────
export interface ApiError {
  error: string
  detail?: string
}

export interface ProjectFilters {
  element?: Element | string
  category?: string
  country?: string
  minPrice?: number
  maxPrice?: number
  progress?: 'under50' | 'over50'
  sort?: 'newest' | 'price' | 'progress'
  limit?: number
  offset?: number
}

// ── Platform stats ────────────────────────────────────────────────────────────
export interface PlatformStats {
  treesFunded: number
  tCO2eVerified: number
  projectsActive: number
}