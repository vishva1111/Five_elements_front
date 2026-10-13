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
  /** Whose funding this is — the person's own (default) or their organisation's. */
  fundedAs?: 'individual' | 'business'
}

export async function submitFunding(payload: FundingPayload): Promise<{ orderId: string; status: string }> {
  const res = await fetch(`${BASE_URL}/api/fund`, {
    method:  'POST',
    headers: await getAuthHeaders(),
    body:    JSON.stringify(payload),
  })
  if (!res.ok) {
    // Surface the server's reason (e.g. "Only 12 trees left in this project")
    const body = await res.json().catch(() => ({}))
    const err = new Error(body.error || `HTTP ${res.status}`) as Error & { remaining?: number }
    if (typeof body.remaining === 'number') err.remaining = body.remaining
    throw err
  }
  return res.json()
}

// ── Shared: surface the server's error message ───────────────────────────────

async function failWith(res: Response): Promise<never> {
  const body = await res.json().catch(() => ({}))
  throw new Error(body.error || `HTTP ${res.status}`)
}

// ── Business dashboard (the organisation's own funding) ──────────────────────

export interface DashboardFunding {
  id: string
  projectId: string
  date: string        // ISO timestamp
  trees: number
  tco2e: number       // estimate
  amount: number      // ₹, incl. platform fee
  verified: boolean
}

export interface DashboardProject {
  id: string
  slug: string
  name: string
  element: string
  elGlyph: string
  location: string
  standard: string
  totalTrees: number
  fundedTrees: number  // whole project, all funders
  status: string
}

export interface DashboardData {
  fundings: DashboardFunding[]
  projects: DashboardProject[]
  updatedAt: string
}

export async function fetchDashboard(): Promise<DashboardData> {
  const res = await fetch(`${BASE_URL}/api/dashboard`, { headers: await getAuthHeaders() })
  if (!res.ok) return failWith(res)
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
  if (!res.ok) return failWith(res)
  return res.json()
}

export async function createReport(input: { year: number; framework: string; name?: string }): Promise<{ report: Report }> {
  const res = await fetch(`${BASE_URL}/api/reports`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify(input),
  })
  if (!res.ok) return failWith(res)
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
  amount: number
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
  emissionsMeasured: boolean
  scopeSummary: ReportScopeItem[]
  funding: {
    treesFunded: number
    treesFundedFmt: string
    amount: number
    tco2e: number
    verifiedLedgerEntries: number
  }
  ledgerEntries: ReportLedgerEntry[]
}

export async function fetchReportDetail(id: string): Promise<{ report: ReportDetailData }> {
  const res = await fetch(`${BASE_URL}/api/reports/${encodeURIComponent(id)}`, { headers: await getAuthHeaders() })
  if (!res.ok) return failWith(res)
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
  if (!res.ok) return failWith(res)
  return res.json()
}

export async function inviteTeamMember(name: string, email: string, role: string): Promise<{ member: TeamMember; emailed: boolean }> {
  const res = await fetch(`${BASE_URL}/api/team`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({ name, email, role }),
  })
  if (!res.ok) return failWith(res)
  return res.json()
}

export async function removeTeamMember(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/api/team/${encodeURIComponent(id)}`, { method: 'DELETE', headers: await getAuthHeaders() })
  if (!res.ok) return failWith(res)
}

// ── Portfolio (the organisation's own funded projects) ───────────────────────

export interface PortfolioProject {
  id: string
  slug: string
  name: string
  element: string
  category: string
  partner: string
  location: string
  standard: string
  trees: number
  amount: number
  fundings: number
  verifiedFundings: number
  verifiedTrees: number
  tco2e: number
  verification: 'verified' | 'partial' | 'pending'
  projectFunded: number
  projectTotal: number
  lastFunded: string | null
}

export interface PortfolioSummary {
  totalFunded: number
  trees: number
  verifiedTrees: number
  tco2e: number
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
  if (!res.ok) return failWith(res)
  return res.json()
}

// ── Business organisation (Settings + Public-profile settings) ───────────────

export interface BusinessOrg {
  profileSlug: string | null
  orgName: string
  industry: string
  country: string
  employees: string
  framework: string
  fyEnd: string
  tagline: string
  website: string
  visibility: 'public' | 'private'
  showTrees: boolean
  showTco2e: boolean
  showProjects: boolean
  showLedger: boolean
  saved: boolean
  updatedAt: string | null
}

export async function fetchBusinessOrg(): Promise<{ org: BusinessOrg }> {
  const res = await fetch(`${BASE_URL}/api/business/org`, { headers: await getAuthHeaders() })
  if (!res.ok) return failWith(res)
  return res.json()
}

export async function saveBusinessOrg(patch: Partial<BusinessOrg>): Promise<{ org: BusinessOrg }> {
  const res = await fetch(`${BASE_URL}/api/business/org`, {
    method: 'PUT',
    headers: await getAuthHeaders(),
    body: JSON.stringify(patch),
  })
  if (!res.ok) return failWith(res)
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
  projectId: string
  project: string
  location: string
  element: string
  trees: number
  tCO2e: number
  amount: number
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
export async function fetchUserImpact(userId: string, as: 'individual' | 'business' = 'individual'): Promise<UserImpactData> {
  if (!userId) return { entries: [], stats: { trees: 0, tCO2e: 0, projects: 0, fundsInvested: 0 } }

  const qs = as === 'business' ? '?as=business' : ''
  const res = await fetch(`${BASE_URL}/api/my-impact${qs}`, { headers: await getAuthHeaders() })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}