/**
 * fieldCaptureQueue.ts — localStorage-backed offline capture queue.
 *
 * Shared by FieldCapture.tsx (adds entries) and SyncQueue.tsx (uploads them).
 * Photos are stored as base64 data URLs so entries genuinely survive a page
 * reload/tab close — the whole point of an "offline queue."
 */

const STORAGE_KEY = 'fe_field_capture_queue_v1'

export interface CaptureEntry {
  id:          string
  lat:         string
  lng:         string
  notes:       string
  photoName:   string
  photoDataUrl: string | null
  submissionId: string | null
  submissionTitle: string | null
  timestamp:   string
  status:      'queued' | 'syncing' | 'synced' | 'failed'
  errorMessage?: string
}

export function loadQueue(): CaptureEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveQueue(entries: CaptureEntry[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch (e) {
    // Most likely quota exceeded from too many/large photos — surface, don't swallow silently
    console.error('[fieldCaptureQueue] failed to save:', e)
  }
}

export function addEntry(entry: CaptureEntry) {
  const queue = loadQueue()
  queue.unshift(entry)
  saveQueue(queue)
  return queue
}

export function removeEntry(id: string) {
  const queue = loadQueue().filter(e => e.id !== id)
  saveQueue(queue)
  return queue
}

export function updateEntry(id: string, patch: Partial<CaptureEntry>) {
  const queue = loadQueue().map(e => e.id === id ? { ...e, ...patch } : e)
  saveQueue(queue)
  return queue
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

export function dataUrlToFile(dataUrl: string, filename: string): File {
  const [header, base64] = dataUrl.split(',')
  const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg'
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new File([bytes], filename, { type: mime })
}
