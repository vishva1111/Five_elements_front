import React, { useState } from 'react'
import { ExternalLink, CheckCircle, Search } from 'lucide-react'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'
import { useLedger } from '../../hooks/useLedger'
import './Ledger.css'

export default function Ledger() {
  const [search, setSearch] = useState('')
  const { entries, stats, loading, error } = useLedger({ search })

  return (
    <div className="ledger">
      <Navbar />

      {/* Header */}
      <div className="ledger__header dark-section">
        <div className="container">
          <p className="section-label" style={{ color: 'var(--color-accent)' }}>PUBLIC LEDGER</p>
          <h1 className="ledger__title">Every entry, open to anyone</h1>
          <p className="ledger__sub">
            Every approved funding and evidence entry is written here. Nothing counts until it's on the ledger.
          </p>
          <div className="ledger__stats">
            <div className="ledger__stat">
              <span className="stat-number">{stats.treesFunded.toLocaleString()}</span>
              <span>trees funded</span>
            </div>
            <div className="ledger__stat">
              <span className="stat-number">{stats.tCO2eVerified.toLocaleString()} tCO₂e</span>
              <span>verified</span>
            </div>
            <div className="ledger__stat">
              <span className="stat-number">{entries.length}</span>
              <span>entries shown</span>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="ledger__search-bar">
        <div className="container">
          <div className="ledger__search-wrap">
            <Search size={16} className="ledger__search-icon" />
            <input
              type="text"
              placeholder="Search by project, funder, or entry ID..."
              className="ledger__search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="container ledger__body">
        <div className="ledger__table-wrap">
          <table className="ledger__table">
            <thead>
              <tr>
                <th>Entry ID</th>
                <th>Date</th>
                <th>Project</th>
                <th>Funder</th>
                <th>Trees</th>
                <th>tCO₂e</th>
                <th>Status</th>
                <th>Tx Hash</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={8} className="ledger__empty">Loading entries…</td>
                </tr>
              )}
              {!loading && error && (
                <tr>
                  <td colSpan={8} className="ledger__empty">Failed to load entries. Please try again.</td>
                </tr>
              )}
              {!loading && !error && entries.length === 0 && (
                <tr>
                  <td colSpan={8} className="ledger__empty">No entries match your search.</td>
                </tr>
              )}
              {!loading && !error && entries.map((entry) => (
                <tr key={entry.id} className="ledger__row">
                  <td className="ledger__id">{entry.id}</td>
                  <td className="ledger__date">{entry.date}</td>
                  <td className="ledger__project">{entry.project}</td>
                  <td className="ledger__funder">{entry.funder}</td>
                  <td className="ledger__trees">{entry.trees.toLocaleString()}</td>
                  <td className="ledger__co2">{entry.tCO2e}</td>
                  <td>
                    {entry.verified && (
                      <span className="badge badge-verified">
                        <CheckCircle size={11} /> Verified
                      </span>
                    )}
                  </td>
                  <td>
                    <a href="#" className="ledger__tx-link">
                      {entry.txHash} <ExternalLink size={11} />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="ledger__note">
          All entries are immutable once written. Transaction hashes link to the public blockchain explorer.
        </p>
      </div>

      <Footer />
    </div>
  )
}