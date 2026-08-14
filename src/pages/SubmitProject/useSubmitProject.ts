/**
 * useSubmitProject — shared draft state for the C1→C4 submission flow.
 *
 * Uses sessionStorage so the draft survives page refreshes within the same
 * browser tab but is cleared when the tab closes.
 */

import { useState, useCallback } from 'react'

export interface SubmitProjectDraft {
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

const DEFAULT_DRAFT: SubmitProjectDraft = {
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

function saveDraft(draft: SubmitProjectDraft) {
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
      saveDraft(next)
      return next
    })
  }, [])

  const clearDraft = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY)
    setDraft({ ...DEFAULT_DRAFT })
  }, [])

  return { draft, updateDraft, clearDraft }
}