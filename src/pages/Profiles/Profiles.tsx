import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { TreePine, Leaf } from 'lucide-react'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'
import { useProfiles } from '../../hooks/useProfiles'
import './Profiles.css'

const FILTER_OPTIONS = ['All', 'Individual', 'Business']

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
            {profiles.map((profile) => (
              <div key={profile.id} className="card profiles__card">
                {/* Avatar */}
                <div className="profiles__card-top dark-section">
                  <div className="profiles__avatar">{profile.avatar}</div>
                  <span className="badge badge-element">{profile.type}</span>
                </div>

                <div className="profiles__card-body">
                  <h3 className="profiles__name">{profile.name}</h3>
                  <p className="profiles__location">📍 {profile.location}</p>

                  <div className="profiles__stats">
                    <div className="profiles__stat">
                      <TreePine size={16} color="var(--color-earth)" />
                      <div>
                        <strong>{profile.trees.toLocaleString()}</strong>
                        <span>trees funded</span>
                      </div>
                    </div>
                    <div className="profiles__stat">
                      <Leaf size={16} color="var(--color-accent)" />
                      <div>
                        <strong>{profile.tCO2e} tCO₂e</strong>
                        <span>verified</span>
                      </div>
                    </div>
                  </div>

                  <Link to={`/profiles/${profile.id}`} className="btn btn-outline btn-sm profiles__view-btn">
                    View profile →
                  </Link>
                </div>
              </div>
            ))}
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