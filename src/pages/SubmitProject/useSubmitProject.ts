/**
 * useSubmitProject — shared draft state for the C1→C4 submission flow.
 *
 * Persists to sessionStorage (survives page refresh within the same tab).
 * Also exposes API helpers for saving drafts and uploading evidence files
 * to the backend.
 */

import { useState, useCallback } from 'react'

export interface SubmitProjectDraft {
  // DB draft id (set after first save to backend)
  draftId: string

  // C1 — project details
  element:     string
  category:    string
  type:        string
  title:       string
  description: string
  location:    string
  startDate:   string
  endDate:     string
  treeCount:   string

  // C2 — executing partner
  partnerType:    string   // 'registered' | 'unregistered' | 'self'
  partnerId:      string   // UUID if registered partner
  partnerName:    string
  partnerContact: string
  partnerRole:    string

  // C3 — evidence
  evidenceFiles:  EvidenceFile[]
  evidenceNotes:  string

  // C4 — review
  declarationAccepted: boolean
}

export interface EvidenceFile {
  id:       string
  name:     string
  size:     number
  type:     string
  dataUrl?: string   // base64 preview for images
}

const STORAGE_KEY = 'fe_submit_draft'
const API_BASE    = import.meta.env.VITE_API_URL || 'http://localhost:5000'

const DEFAULT_DRAFT: SubmitProjectDraft = {
  draftId:             '',
  element:             'earth',
  category:            '',
  type:                '',
  title:               '',
  description:         '',
  location:            '',
  startDate:           '',
  endDate:             '',
  treeCount:           '',
  partnerType:         'self',
  partnerId:           '',
  partnerName:         '',
  partnerContact:      '',
  partnerRole:         '',
  evidenceFiles:       [],
  evidenceNotes:       '',
  declarationAccepted: false,
}

function loadDraft(): SubmitProjectDraft {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULT_DRAFT, ...JSON.parse(raw) }
  } catch {
    // ignore parse errors
  }
  return { ...DEFAULT_DRAFT }
}

function saveDraftLocal(draft: SubmitProjectDraft) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
  } catch {
    // ignore storage errors
  }
}

export function useSubmitProject() {
  const [draft, setDraft] = useState<SubmitProjectDraft>(loadDraft)

  const updateDraft = useCallback((partial: Partial<SubmitProjectDraft>) => {
    setDraft(prev => {
      const next = { ...prev, ...partial }
      saveDraftLocal(next)
      return next
    })
  }, [])

  const clearDraft = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY)
    setDraft({ ...DEFAULT_DRAFT })
  }, [])

  /**
   * saveDraftToAPI — upserts the current draft to the backend.
   * Returns the draftId (creates one on first call, reuses on subsequent calls).
   * Requires a valid Supabase access token.
   */
  const saveDraftToAPI = useCallback(async (
    partial: Partial<SubmitProjectDraft>,
    token: string
  ): Promise<string | null> => {
    const merged = { ...draft, ...partial }
    updateDraft(partial)

    try {
      const res = await fetch(`${API_BASE}/api/submit-project/draft`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          draftId:        merged.draftId || undefined,
          element:        merged.element,
          category:       merged.category,
          type:           merged.type,
          title:          merged.title,
          description:    merged.description,
          location:       merged.location,
          startDate:      merged.startDate,
          endDate:        merged.endDate,
          treeCount:      merged.treeCount,
          partnerType:    merged.partnerType,
          partnerName:    merged.partnerName,
          partnerContact: merged.partnerContact,
          partnerRole:    merged.partnerRole,
          evidenceNotes:  merged.evidenceNotes,
          fileCount:      merged.evidenceFiles.length,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Draft save failed')

      // Persist the returned draftId
      if (data.id && data.id !== merged.draftId) {
        updateDraft({ draftId: data.id })
      }
      return data.id as string
    } catch (err) {
      console.error('[saveDraftToAPI]', err)
      return null
    }
  }, [draft, updateDraft])

  /**
   * uploadEvidenceFiles — uploads File objects to the backend /upload endpoint.
   * Returns an array of { name, ok, id?, error? } results.
   * Requires a valid draftId and access token.
   */
  const uploadEvidenceFiles = useCallback(async (
    files: File[],
    submissionId: string,
    token: string
  ): Promise<{ name: string; ok: boolean; id?: string; error?: string }[]> => {
    const formData = new FormData()
    formData.append('submissionId', submissionId)
    files.forEach(f => formData.append('files', f))

    try {
      const res = await fetch(`${API_BASE}/api/submit-project/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      return data.results || []
    } catch (err) {
      console.error('[uploadEvidenceFiles]', err)
      return files.map(f => ({ name: f.name, ok: false, error: String(err) }))
    }
  }, [])

  return { draft, updateDraft, clearDraft, saveDraftToAPI, uploadEvidenceFiles }
}