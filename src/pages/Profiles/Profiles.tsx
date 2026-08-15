import React, { useState } from 'react'
import { TreePine, Leaf } from 'lucide-react'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'
import { useProfiles } from '../../hooks/useProfiles'
import './Profiles.css'

const FILTER_OPTIONS = ['All', 'Individual', 'Business']

// Generate initials from name (e.g. "Meridian Manufacturing" → "MM")
function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('')
}

// Pentagon SVG avatar with initials
function PentaAvatar({ initials, isOrg }: { initials: string; isOrg: boolean }) {
  const pts = '52,4 96,34 80,88 24,88 8,34'
  const bg = isOrg ? '#1A3330' : '#1A3330'
  const stroke = isOrg ? '#F09125' : '#AACBA7'
  return (
    <svg width="104" height="96" viewBox="0 0 104 96" aria-hidden="true">
      <polygon points={pts} fill={bg} stroke={stroke} strokeWidth="2.5" strokeLinejoin="round" />
      <text
        x="52" y="56"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="22"
        fontWeight="800"
        fill={isOrg ? '#F09125' : '#AACBA7'}
        fontFamily="system-ui, sans-serif"
        letterSpacing="1"
      >
        {initials}
      </text>
    </svg>
  )
}

export default function Profiles() {
  const [filter, setFilter] = useState('All')
  const { profiles, loading, error } = useProfiles({ type: filter })

  return (
    <div className="profiles">
      <Navbar />

      <div className="profiles__header">
        <div className="container">
          <p className="section-label">IMPACT IN THE OPEN</p>
          <h1 className="profiles__title">Explore profiles</h1>
          <p className="profiles__sub">
            Every funder's impact is public. See who's funding what — and where the trees are growing.
          </p>
        </div>
      </div>

      <div className="container profiles__body">
        {/* Filter */}
        <div className="profiles__filters">
          {FILTER_OPTIONS.map((f) => (
            <button
              key={f}
              className={`chip ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Loading state */}
        {loading && (
          <div className="profiles__empty">
            <p>Loading profiles…</p>
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="profiles__empty">
            <p>Failed to load profiles.</p>
            <button className="btn btn-outline btn-sm" onClick={() => window.location.reload()}>
              Try again
            </button>
          </div>
        )}

        {/* Grid */}
        {!loading && !error && profiles.length > 0 && (
          <div className="grid-3">
            {profiles.slice(0, 5).map((profile) => {
              const isOrg = profile.type === 'organisation' || (profile.type as string) === 'Business'
              const initials = getInitials(profile.name)
              const typeLabel = isOrg ? 'Business' : 'Individual'
              return (
                <div key={profile.id} className="profiles__card">
                  {/* Card top — dark hero with avatar */}
                  <div className="profiles__card-top">
                    <PentaAvatar initials={initials} isOrg={isOrg} />
                    <span className={`profiles__type-badge ${isOrg ? 'profiles__type-badge--org' : 'profiles__type-badge--ind'}`}>
                      {typeLabel}
                    </span>
                  </div>

                  {/* Card body */}
                  <div className="profiles__card-body">
                    <h3 className="profiles__name">{profile.name}</h3>
                    <p className="profiles__location">
                      <span className="profiles__location-dot">📍</span> {profile.location}
                    </p>

                    <div className="profiles__stats">
                      <div className="profiles__stat">
                        <TreePine size={15} color="var(--color-earth)" />
                        <div>
                          <strong>{profile.trees.toLocaleString()}</strong>
                          <span>Trees funded</span>
                        </div>
                      </div>
                      <div className="profiles__stat-divider" />
                      <div className="profiles__stat">
                        <Leaf size={15} color="var(--color-accent)" />
                        <div>
                          <strong>{Number(profile.tCO2e).toFixed(2)} tCO₂e</strong>
                          <span>Verified</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {!loading && !error && profiles.length === 0 && (
          <div className="profiles__empty">
            <p>No profiles found.</p>
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}