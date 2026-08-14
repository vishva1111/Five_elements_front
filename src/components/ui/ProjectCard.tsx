import React from 'react'
import { Link } from 'react-router-dom'
import { MapPin, CheckCircle } from 'lucide-react'
import './ProjectCard.css'

export default function ProjectCard({ project }) {
  const progress = Math.round((project.fundedTrees / project.totalTrees) * 100)

  return (
    <Link to={`/projects/${project.id}`} className="project-card card">
      {/* Pentagon image placeholder */}
      <div className="project-card__image">
        <div className="project-card__pentagon-wrap">
          <div className="project-card__pentagon">
            <span className="project-card__pentagon-icon">📷</span>
            <span className="project-card__pentagon-label">
              Drop a photo — {project.name.split(' ').slice(0, 2).join(' ').toLowerCase()}
            </span>
          </div>
        </div>
        <span className="badge badge-element project-card__element-badge">
          🌍 Earth
        </span>
        {project.verified && (
          <span className="badge badge-verified project-card__verified-badge">
            ✓ Verified
          </span>
        )}
      </div>

      {/* Body */}
      <div className="project-card__body">
        <h3 className="project-card__name">{project.name}</h3>

        <div className="project-card__meta">
          <MapPin size={13} />
          <span>{project.location}</span>
          {project.verified && (
            <>
              <span className="project-card__dot">·</span>
              <span className="project-card__partner">Partner: {project.partner}</span>
            </>
          )}
        </div>

        {/* Stats row */}
        <div className="project-card__stats">
          <div className="project-card__stat">
            <span className="project-card__stat-num">{project.fundedTrees.toLocaleString()}</span>
            <span className="project-card__stat-label">trees</span>
          </div>
          <div className="project-card__stat-divider" />
          <div className="project-card__stat">
            <span className="project-card__stat-num">{project.tCO2e}</span>
            <span className="project-card__stat-label">tCO₂e</span>
          </div>
          <div className="project-card__stat-divider" />
          <div className="project-card__stat">
            <span className="project-card__stat-num">{project.evidenceEntries}</span>
            <span className="project-card__stat-label">evidence entries</span>
          </div>
        </div>

        {/* Progress */}
        <div className="project-card__progress">
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="project-card__progress-label">
            <span className="project-card__progress-pct">{progress}%</span>
            <span className="project-card__progress-count">
              {project.fundedTrees.toLocaleString()} of {project.totalTrees.toLocaleString()} trees
            </span>
          </div>
        </div>

        {/* Price + ledger link */}
        <div className="project-card__footer">
          <div className="project-card__price-wrap">
            <span className="project-card__price">₹{project.pricePerTree}</span>
            <span className="project-card__price-label">/ tree</span>
          </div>
          <span className="project-card__ledger-link">View on the ledger →</span>
        </div>
      </div>
    </Link>
  )
}