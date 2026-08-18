import type { ProjectFilters, ProjectsResponse, Project, LedgerEntry, Profile } from '../types'
import { supabase } from '../supabaseClient'

// ── Auth token helper ─────────────────────────────────────────────────────────
async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  return token ? { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } : { 'Content-Type': 'application/json' }
}

// ── Supabase direct config ────────────────────────────────────────────────────
const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL  as string
const SUPABASE_KEY  = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// ── Generic Supabase REST helper ──────────────────────────────────────────────
async function sbFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const qs = new URLSearchParams(params).toString()
  const url = `${SUPABASE_URL}/rest/v1/${path}${qs ? `?${qs}` : ''}`
  const res = await fetch(url, {
    headers: {
      'apikey':        SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Content-Type':  'application/json',
      'Accept':        'application/json',
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error((body as { message?: string }).message || `HTTP ${res.status}`)
  }
  return res.json() as Promise<T>
}

// ── DB row type (snake_case from Supabase) ────────────────────────────────────
interface ProjectRow {
  id: string
  slug: string
  name: string
  element: string
  category: string
  location: string
  country: string
  partner: string
  certification: string | null
  certification_id: string | null
  price_per_tree: number
  total_trees: number
  funded_trees: number
  funders_count: number
  last_evidence_date: string | null
  evidence_count: number
  tco2e: number
  description: string | null
  verified: boolean
  status: string
  created_at: string
  cover_image: string | null
}

function rowToProject(p: ProjectRow): Project {
  return {
    id:              p.id,
    slug:            p.slug,
    name:            p.name,
    element:         p.element as Project['element'],
    category:        p.category,
    location:        p.location,
    country:         p.country,
    partner:         p.partner,
    certification:   p.certification ?? '',
    certificationId: p.certification_id ?? '',
    pricePerTree:    p.price_per_tree,
    totalTrees:      p.total_trees,
    fundedTrees:     p.funded_trees,
    fundersCount:    p.funders_count,
    lastEvidenceDate: p.last_evidence_date ?? '',
    evidenceCount:   p.evidence_count,
    tCO2e:           Number(p.tco2e),
    description:     p.description ?? '',
    verified:        p.verified,
    status:          p.status as Project['status'],
    createdAt:       p.created_at,
    coverImage:      p.cover_image ?? null,
  }
}

// ── Projects ──────────────────────────────────────────────────────────────────

export async function fetchProjects(params: ProjectFilters = {}): Promise<ProjectsResponse> {
  const qs: Record<string, string> = {
    status: 'eq.active',
    select: 'id,slug,name,element,category,location,country,partner,certification,certification_id,price_per_tree,total_trees,funded_trees,funders_count,last_evidence_date,evidence_count,tco2e,description,verified,status,created_at,cover_image',
  }

  if (params.element) qs['element'] = `eq.${params.element}`
  if (params.category && params.category !== 'All') qs['category'] = `eq.${params.category}`
  if (params.country  && params.country  !== 'All') qs['country']  = `ilike.%${params.country}%`
  if (params.minPrice !== undefined) qs['price_per_tree'] = `gte.${params.minPrice}`
  if (params.maxPrice !== undefined) qs['price_per_tree'] = `lte.${params.maxPrice}`

  // Sorting
  if (params.sort === 'price')    qs['order'] = 'price_per_tree.asc'
  else if (params.sort === 'progress') qs['order'] = 'funded_trees.desc'
  else                            qs['order'] = 'created_at.desc'

  qs['limit'] = '50'

  const rows = await sbFetch<ProjectRow[]>('projects', qs)
  let projects = rows.map(rowToProject)

  // Post-fetch progress filter
  if (params.progress === 'under50') {
    projects = projects.filter(p => p.fundedTrees / p.totalTrees < 0.5)
  } else if (params.progress === 'over50') {
    projects = projects.filter(p => p.fundedTrees / p.totalTrees >= 0.5)
  }

  return { data: projects, count: projects.length }
}

export async function fetchProject(slugOrId: string): Promise<Project> {
  // Try by slug first
  const bySlug = await sbFetch<ProjectRow[]>('projects', {
    select: '*',
    slug: `eq.${slugOrId}`,
    limit: '1',
  })
  if (bySlug && bySlug.length > 0) return rowToProject(bySlug[0])

  // Fallback: try by id
  const byId = await sbFetch<ProjectRow[]>('projects', {
    select: '*',
    id: `eq.${slugOrId}`,
    limit: '1',
  })
  if (byId && byId.length > 0) return rowToProject(byId[0])

  throw new Error('Project not found')
}

export async function fetchProjectCategories(): Promise<{ categories: string[] }> {
  const rows = await sbFetch<{ category: string }[]>('projects', {
    select: 'category',
    status: 'eq.active',
  })
  const cats = ['All', ...Array.from(new Set(rows.map(r => r.category).filter(Boolean)))]
  return { categories: cats }
}

// ── Ledger ────────────────────────────────────────────────────────────────────

interface LedgerRow {
  id: string
  date: string
  project: string
  funder: string
  trees: number
  t_co2e: number
  verified: boolean
  tx_hash: string
}

export async function fetchLedgerEntries(params: { search?: string; limit?: number; offset?: number } = {}): Promise<{ data: LedgerEntry[]; count: number }> {
  const qs: Record<string, string> = {
    select: 'id,date,project,funder,trees,t_co2e,verified,tx_hash',
    order:  'created_at.desc',
    limit:  String(params.limit || 200),  // fetch more so client-side search works across all entries
  }
  if (params.offset) qs['offset'] = String(params.offset)

  const rows = await sbFetch<LedgerRow[]>('ledger_entries', qs)

  // Map snake_case DB fields to camelCase LedgerEntry type
  const mapped: LedgerEntry[] = rows.map(r => ({
    id:       r.id,
    date:     r.date,
    project:  r.project,
    funder:   r.funder,
    trees:    r.trees,
    tCO2e:    r.t_co2e,
    verified: r.verified,
    txHash:   r.tx_hash,
  }))

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
  const rows = await sbFetch<{ trees_funded: number; t_co2e_verified: number; projects_active: number }[]>('platform_stats', {
    select: 'trees_funded,t_co2e_verified,projects_active',
    limit:  '1',
  })
  const r = rows[0] || { trees_funded: 0, t_co2e_verified: 0, projects_active: 0 }
  return { treesFunded: r.trees_funded, tCO2eVerified: Number(r.t_co2e_verified), projectsActive: r.projects_active }
}

// ── Profiles ──────────────────────────────────────────────────────────────────

interface ProfileRow {
  id: string
  name: string
  type: string
  location: string
  avatar: string
  trees: number
  t_co2e: string | number
  created_at: string
}

export async function fetchProfiles(params: { type?: string } = {}): Promise<{ data: Profile[] }> {
  const qs: Record<string, string> = {
    select: 'id,name,type,location,avatar,trees,t_co2e,created_at',
    order:  'trees.desc',
    // Only show profiles with trees > 0 (real users with actual impact)
    trees:  'gt.0',
  }
  if (params.type && params.type !== 'All') qs['type'] = `eq.${params.type}`
  const rows = await sbFetch<ProfileRow[]>('profiles', qs)

  // Map snake_case t_co2e → camelCase tCO2e, and normalize type casing
  const mapped: Profile[] = rows.map(r => ({
    id:       r.id,
    name:     r.name,
    type:     (r.type?.toLowerCase() === 'business' ? 'organisation' : 'individual') as Profile['type'],
    location: r.location,
    avatar:   r.avatar || '',
    trees:    r.trees,
    tCO2e:    Number(r.t_co2e) || 0,
  }))

  return { data: mapped }
}

export async function fetchProfileRaw(id: string): Promise<Profile> {
  const rows = await sbFetch<Profile[]>('profiles', {
    select: '*',
    id:     `eq.${id}`,
    limit:  '1',
  })
  if (!rows || rows.length === 0) throw new Error('Profile not found')
  return rows[0]
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
}

export async function submitFunding(payload: FundingPayload): Promise<{ orderId: string; status: string }> {
  const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
  const res = await fetch(`${BASE_URL}/api/fund`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
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
  const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
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
  const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
  const res = await fetch(`${BASE_URL}/api/reports`, { headers: await getAuthHeaders() })
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
  const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
  const res = await fetch(`${BASE_URL}/api/team`, { headers: await getAuthHeaders() })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export async function inviteTeamMember(name: string, email: string, role: string): Promise<{ member: TeamMember }> {
  const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
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
  const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
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
  const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
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
  const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
  const res = await fetch(`${BASE_URL}/api/profiles/${slug}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}