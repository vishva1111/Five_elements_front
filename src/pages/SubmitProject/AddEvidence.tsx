import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import SubmitProjectLayout from './SubmitProjectLayout'
import { useSubmitProject, EvidenceFile } from './useSubmitProject'
import './SubmitProject.css'

const ACCEPTED = '.jpg,.jpeg,.png,.pdf,.mp4,.mov,.kml,.gpx'
const MAX_FILES = 20
const MAX_MB    = 50

function fileIcon(type: string): string {
  if (type.startsWith('image/'))  return '🖼️'
  if (type === 'application/pdf') return '📄'
  if (type.startsWith('video/'))  return '🎥'
  return '📎'
}

function fmtSize(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function AddEvidence() {
  const navigate = useNavigate()
  const { draft, updateDraft } = useSubmitProject()
  const inputRef = useRef<HTMLInputElement>(null)

  const [files,   setFiles]   = useState<EvidenceFile[]>(draft.evidenceFiles || [])
  const [notes,   setNotes]   = useState(draft.evidenceNotes || '')
  const [drag,    setDrag]    = useState(false)
  const [errors,  setErrors]  = useState<string[]>([])

  function processFiles(raw: FileList | null) {
    if (!raw) return
    const errs: string[] = []
    const added: EvidenceFile[] = []

    Array.from(raw).forEach(f => {
      if (files.length + added.length >= MAX_FILES) {
        errs.push(`Maximum ${MAX_FILES} files allowed.`)
        return
      }
      if (f.size > MAX_MB * 1024 * 1024) {
        errs.push(`${f.name} exceeds ${MAX_MB} MB limit.`)
        return
      }
      added.push({
        id:   `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: f.name,
        size: f.size,
        type: f.type,
      })
    })

    setErrors(errs)
    setFiles(prev => [...prev, ...added])
  }

  function removeFile(id: string) {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setDrag(false)
    processFiles(e.dataTransfer.files)
  }

  function handleNext() {
    if (files.length === 0) {
      setErrors(['Please add at least one piece of evidence before continuing.'])
      return
    }
    updateDraft({ evidenceFiles: files, evidenceNotes: notes })
    navigate('/submit-project/review')
  }

  function handleBack() {
    updateDraft({ evidenceFiles: files, evidenceNotes: notes })
    navigate('/submit-project/partner')
  }

  return (
    <SubmitProjectLayout onSaveExit={() => navigate('/')}>
      <div className="sp-page-header">
        <h1>Add evidence</h1>
        <p>
          Upload photos, GPS files, PDFs, or video that prove the work happened.
          The more evidence you provide, the faster verification goes.
        </p>
      </div>

      {errors.length > 0 && (
        <div className="sp-error-banner">
          <span className="sp-error-banner__icon">!</span>
          <div className="sp-error-banner__text">
            {errors.map((e, i) => <div key={i}>{e}</div>)}
          </div>
        </div>
      )}

      <div className="sp-cols">
        <div className="sp-col-main">

          {/* Drop zone */}
          <div
            className={`sp-upload-zone ${drag ? 'sp-upload-zone--drag' : ''}`}
            onDragOver={e => { e.preventDefault(); setDrag(true) }}
            onDragLeave={() => setDrag(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={e => e.key === 'Enter' && inputRef.current?.click()}
            aria-label="Upload evidence files"
          >
            <div className="sp-upload-zone__icon">📁</div>
            <div className="sp-upload-zone__title">Drop files here or click to browse</div>
            <div className="sp-upload-zone__sub">
              Photos, PDFs, GPS files (.kml/.gpx), video · Max {MAX_MB} MB per file · Up to {MAX_FILES} files
            </div>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPTED}
              multiple
              style={{ display: 'none' }}
              onChange={e => processFiles(e.target.files)}
            />
          </div>

          {/* File list */}
          {files.length > 0 && (
            <div className="sp-file-list">
              {files.map(f => (
                <div key={f.id} className="sp-file-item">
                  <span className="sp-file-item__icon">{fileIcon(f.type)}</span>
                  <span className="sp-file-item__name">{f.name}</span>
                  <span className="sp-file-item__size">{fmtSize(f.size)}</span>
                  <button
                    type="button"
                    className="sp-file-item__remove"
                    onClick={() => removeFile(f.id)}
                    aria-label={`Remove ${f.name}`}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Notes */}
          <div className="sp-field">
            <label className="sp-label" htmlFor="c3-notes">Evidence notes</label>
            <textarea
              id="c3-notes"
              className="sp-textarea"
              rows={3}
              placeholder="Describe what the files show — GPS coordinates, dates, species planted, methodology…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>
        </div>

        {/* Side card */}
        <div className="sp-col-side">
          <div className="sp-side-card">
            <div className="sp-side-card__title">What counts as evidence?</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { icon: '📸', text: 'Geo-tagged photos of planting / work' },
                { icon: '📍', text: 'GPS track files (.kml, .gpx)' },
                { icon: '📄', text: 'Official reports or certificates' },
                { icon: '🎥', text: 'Video footage of the site' },
                { icon: '🗺️', text: 'Satellite imagery or maps' },
              ].map(e => (
                <div key={e.text} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 16, flexShrink: 0 }}>{e.icon}</span>
                  <span style={{ fontSize: 13, color: '#3a453c', lineHeight: 1.4 }}>{e.text}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="sp-side-card">
            <div className="sp-side-card__title">Files added</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#2B5341' }}>{files.length}</div>
            <div style={{ fontSize: 12, color: '#9AA79C' }}>of {MAX_FILES} maximum</div>
          </div>
        </div>
      </div>

      {/* Footer nav */}
      <div className="sp-footer">
        <button type="button" className="sp-btn sp-btn--ghost" onClick={handleBack}>
          ← Back
        </button>
        <button type="button" className="sp-btn sp-btn--primary" onClick={handleNext}>
          Next: Review & submit →
        </button>
      </div>
    </SubmitProjectLayout>
  )
}