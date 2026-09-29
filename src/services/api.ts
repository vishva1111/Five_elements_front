import type { ProjectFilters, ProjectsResponse, Project, LedgerEntry, Profile } from '../types'
import { API_URL as BASE_URL } from '../config/api'
import { getValidAccessToken } from './authTokens'

// ── Auth token helper ─────────────────────────────────────────────────────────
async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getValidAccessToken()
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
}

// ── Projects ─────────────────────────────────────────────────────────────────
// GET /api/projects already returns camelCase, normalised rows — same shape
// this used to build client-side from a raw Supabase select.

export async function fetchProjects(params: ProjectFilters = {}): Promise<ProjectsResponse> {
  const qs = new URLSearchParams()
  if (params.element) qs.set('element', params.element)
  if (params.category && params.category !== 'All') qs.set('category', params.category)
  if (params.country  && params.country  !== 'All') qs.set('country', params.country)
  if (params.minPrice !== undefined) qs.set('minPrice', String(params.minPrice))
  if (params.maxPrice !== undefined) qs.set('maxPrice', String(params.maxPrice))
  if (params.progress) qs.set('progress', params.progress)
  qs.set('sort', params.sort || 'newest')
  qs.set('limit', '50')

  const res = await fetch(`${BASE_URL}/api/projects?${qs.toString()}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  const projects: Project[] = (json.data || []).map((p: Project) => ({ ...p, tCO2e: Number(p.tCO2e) }))
  return { data: projects, count: json.count ?? projects.length }
}

export async function fetchProject(slugOrId: string): Promise<Project> {
  const res = await fetch(`${BASE_URL}/api/projects/${encodeURIComponent(slugOrId)}`)
  if (res.status === 404) throw new Error('Project not found')
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const p = await res.json()
  return { ...p, tCO2e: Number(p.tCO2e) }
}

export async function fetchProjectCategories(): Promise<{ categories: string[] }> {
  const res = await fetch(`${BASE_URL}/api/projects/meta/categories`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// ── Ledger ────────────────────────────────────────────────────────────────────

export async function fetchLedgerEntries(params: { search?: string; limit?: number; offset?: number } = {}): Promise<{ data: LedgerEntry[]; count: number }> {
  const qs = new URLSearchParams()
  qs.set('limit', String(params.limit || 200))  // fetch more so client-side search works across all entries
  if (params.offset) qs.set('offset', String(params.offset))

  const res = await fetch(`${BASE_URL}/api/ledger?${qs.toString()}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = await res.json()
  const mapped: LedgerEntry[] = json.data || []

  // Client-side search: filter by project, funder, or entry ID
  const filtered = params.search
    ? mapped.filter(r => {
        const q = params.search!.toLowerCase()
        return (
          (r.project || '').toLowerCase().includes(q) ||
          (r.funder  || '').toLowerCase().includes(q) ||
          (r.id      || '').toLowerCase().includes(q)
        )
      })
    : mapped

  return { data: filtered, count: filtered.length }
}

export async function fetchPlatformStats(): Promise<{ treesFunded: number; tCO2eVerified: number; projectsActive: number }> {
  const res = await fetch(`${BASE_URL}/api/stats`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// ── Profiles ──────────────────────────────────────────────────────────────────

export async function fetchProfiles(params: { type?: string } = {}): Promise<{ data: Profile[] }> {
  const qs = new URLSearchParams()
  if (params.type && params.type !== 'All') qs.set('type', params.type)

  const res = await fetch(`${BASE_URL}/api/profiles?${qs.toString()}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// ── Fund flow ─────────────────────────────────────────────────────────────────

export interface FundingPayload {
  projectId: string
  trees: number
  paymentMethod: 'card' | 'invoice'
  cardToken?: string
  poNumber?: string
  publicAttribution: boolean
  funderName?: string
  userId?: string
}

export async function submitFunding(payload: FundingPayload): Promise<{ orderId: string; status: string }> {
  const res = await fetch(`${BASE_URL}/api/fund`, {
    method:  'POST',
    headers: await getAuthHeaders(),
    body:    JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export interface DashboardImpact {
  treesFunded: number
  tco2eVerified: number
  projectsActive: number
  projectsFunded: number
}

export interface DashboardProject {
  id: string
  slug: string
  name: string
  element: string
  elGlyph: string
  heroBg: string
  location: string
  standard: string
  tco2: string
  fundedTrees: number
  totalTrees: number
  progressPct: number
  verified: boolean
  status: string
  statusBg: string
}

export interface DashboardData {
  impact: DashboardImpact
  portfolio: DashboardProject[]
  period: string
  updatedAt: string
}

export async function fetchDashboard(): Promise<DashboardData> {
  const res = await fetch(`${BASE_URL}/api/dashboard`, { headers: await getAuthHeaders() })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// ── Reports ───────────────────────────────────────────────────────────────────

export interface Report {
  id: string
  name: string
  status: string
  framework: string
  period: string
  date: string
}

export async function fetchReports(): Promise<{ reports: Report[] }> {
  const res = await fetch(`${BASE_URL}/api/reports`, { headers: await getAuthHeaders() })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export interface ReportScopeItem {
  label: string
  value: string
  desc: string
}

export interface ReportLedgerEntry {
  id: string
  date: string
  project: string
  projectId: string
  trees: number
  tCO2e: number
  verified: boolean
  txHash: string | null
}

export interface ReportDetailData {
  id: string
  name: string
  status: string
  framework: string
  period: string
  orgName: string
  date: string
  scopeSummary: ReportScopeItem[]
  funding: {
    treesFunded: number
    treesFundedFmt: string
    verifiedLedgerEntries: number
  }
  ledgerEntries: ReportLedgerEntry[]
}

export async function fetchReportDetail(id: string): Promise<{ report: ReportDetailData }> {
  const res = await fetch(`${BASE_URL}/api/reports/${id}`, { headers: await getAuthHeaders() })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// ── Team ──────────────────────────────────────────────────────────────────────

export interface TeamMember {
  id: string
  name: string
  email: string
  role: string
}

export async function fetchTeam(): Promise<{ members: TeamMember[] }> {
  const res = await fetch(`${BASE_URL}/api/team`, { headers: await getAuthHeaders() })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function inviteTeamMember(name: string, email: string, role: string): Promise<{ member: TeamMember }> {
  const headers = await getAuthHeaders()
  const res = await fetch(`${BASE_URL}/api/team`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name, email, role }),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function removeTeamMember(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/team/${id}`, { method: 'DELETE', headers: await getAuthHeaders() })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
}

// ── Portfolio ─────────────────────────────────────────────────────────────────

export interface PortfolioProject {
  id: string
  name: string
  element: string
  category: string
  partner: string
  location: string
  fundedAmount: number
  fundedAmountFmt: string
  fundedTrees: number
  totalTrees: number
  progressPct: number
  progressLabel: string
  barColor: string
  rowBg: string
  verificationStatus: string
  standard: string
  hasLedgerEntry: boolean
  ledgerEntryId?: string
  tco2e: string
}

export interface PortfolioSummary {
  totalFunded: string
  verifiedTco2: string
  verifiedTrees: string
  projectCount: number
  elementsActive: number
  elementsTotal: number
}

export interface PortfolioData {
  summary: PortfolioSummary
  projects: PortfolioProject[]
}

export async function fetchPortfolio(): Promise<PortfolioData> {
  const res = await fetch(`${BASE_URL}/api/portfolio`, { headers: await getAuthHeaders() })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}
// ── Public Profile ────────────────────────────────────────────────────────────

export interface ProfileStat {
  label: string
  value: string
  unit: string
}

export interface ProfileTile {
  id: string
  icon: string
  qty: string
  date: string
  type: string
  hero: string
  tco2e: number
  location: string
  standard: string
  txHash: string
}

export interface ProfileProject {
  id: string
  name: string
  location: string
  standard: string
  hero: string
}

export interface ProfileBadge {
  icon: string
  label: string
  fill: string
  opacity: number
}

export interface ProfileData {
  id: string
  slug: string
  displayName: string
  bio: string
  metaLine: string
  isOrg: boolean
  website: string | null
  shareNote: string
  shareUrl: string
  radarValues: number[]
  stats: ProfileStat[]
  tiles: ProfileTile[]
  projects: ProfileProject[]
  badges: ProfileBadge[]
}

export async function fetchProfile(slug: string): Promise<ProfileData> {
  const res = await fetch(`${BASE_URL}/api/profiles/${slug}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

// ── User Impact (individual dashboard) ───────────────────────────────────────

export interface UserImpactEntry {
  id: string
  date: string
  project: string
  trees: number
  tCO2e: number
  verified: boolean
  txHash: string
}

export interface UserImpactStats {
  trees: number
  tCO2e: number
  projects: number
  fundsInvested: number
}

export interface UserImpactData {
  entries: UserImpactEntry[]
  stats: UserImpactStats
}

/**
 * Fetch all funding records for the currently logged-in user, from
 * GET /api/my-impact — an authed route that scopes the query to req.userId
 * server-side (used to query individual_fundings directly, relying on RLS
 * to do that same scoping in the browser instead).
 */
export async function fetchUserImpact(userId: string): Promise<UserImpactData> {
  if (!userId) return { entries: [], stats: { trees: 0, tCO2e: 0, projects: 0, fundsInvested: 0 } }

  const res = await fetch(`${BASE_URL}/api/my-impact`, { headers: await getAuthHeaders() })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}