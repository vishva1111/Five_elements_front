import React, { useState } from 'react'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'
import './Business.css'

export default function BulkUpload() {
  const [dragging, setDragging] = useState(false)
  const [file, setFile] = useState(null)

  return (
    <div className="business-page">
      <Navbar />
      <div className="business-page__header dark-section">
        <div className="container">
          <p className="section-label" style={{ color: 'var(--color-accent)' }}>BULK UPLOAD</p>
          <h1 className="business-page__title">Upload emissions data</h1>
          <p className="business-page__sub">Upload a CSV or Excel file — utility bills, fuel logs, travel records.</p>
        </div>
      </div>
      <div className="container business-page__body">
        <div
          className="card"
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); setFile(e.dataTransfer.files[0]) }}
          style={{
            padding: 48,
            textAlign: 'center',
            border: `2px dashed ${dragging ? 'var(--color-earth)' : 'rgba(0,0,0,0.12)'}`,
            background: dragging ? '#f0f7f4' : '#fff',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>📤</div>
          {file ? (
            <p style={{ fontWeight: 700, color: 'var(--color-earth)' }}>✓ {file.name} ready to upload</p>
          ) : (
            <>
              <p style={{ fontWeight: 600, color: 'var(--color-text-dark)' }}>Drag & drop your file here</p>
              <p style={{ fontSize: 13, color: 'var(--color-text-muted-dark)', marginTop: 4 }}>CSV, XLS, XLSX — max 10 MB</p>
            </>
          )}
          <input
            type="file"
            accept=".csv,.xls,.xlsx"
            style={{ display: 'none' }}
            onChange={e => setFile(e.target.files[0])}
            id="bulk-file"
          />
          <label htmlFor="bulk-file" className="btn btn-outline btn-sm" style={{ marginTop: 16, display: 'inline-flex', cursor: 'pointer' }}>
            Browse files
          </label>
        </div>

        {file && (
          <button className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
            Process upload
          </button>
        )}

        <div className="business-page__section">
          <div className="business-page__section-header"><h2>Template</h2></div>
          <p style={{ fontSize: 14, color: 'var(--color-text-muted-dark)' }}>
            Download our CSV template to ensure your data is formatted correctly.
          </p>
          <a href="#" className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start', marginTop: 8 }}>
            Download template →
          </a>
        </div>
      </div>
      <Footer />
    </div>
  )
}