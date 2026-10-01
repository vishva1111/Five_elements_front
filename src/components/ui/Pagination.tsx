/**
 * Shared list pagination — same look as the Tasks board pager.
 *
 *   const pg = usePagination(rows)
 *   pg.items.map(...)
 *   <Pagination {...pg} noun="record" />
 */
import React, { useEffect, useState } from 'react'

export function usePagination<T>(all: T[], initialSize = 10) {
  const [page, setPage]         = useState(1)
  const [pageSize, setPageSize] = useState(initialSize)

  const total       = all.length
  const totalPages  = Math.max(1, Math.ceil(total / pageSize))
  const currentPage = Math.min(page, totalPages)
  const start       = (currentPage - 1) * pageSize

  // Back to the first page whenever the list itself shrinks/grows (filters, reloads).
  useEffect(() => { setPage(1) }, [total, pageSize])

  return {
    items: all.slice(start, start + pageSize),
    total, start, pageSize, currentPage, totalPages,
    setPage, setPageSize,
  }
}

interface PaginationProps {
  total:       number
  start:       number
  pageSize:    number
  currentPage: number
  totalPages:  number
  setPage:     (fn: (p: number) => number) => void
  setPageSize: (n: number) => void
  /** Singular label for the count, e.g. "record" → "of 27 records". */
  noun?:       string
  /** Hide when everything fits on one page at the smallest size. */
  hideWhenSmall?: boolean
}

export default function Pagination({
  total, start, pageSize, currentPage, totalPages, setPage, setPageSize,
  noun = 'item', hideWhenSmall = false,
}: PaginationProps) {
  if (total === 0) return null
  if (hideWhenSmall && total <= 10) return null

  const goto = (p: number) => setPage(() => p)

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 12, flexWrap: 'wrap', padding: '12px 4px 0', marginTop: 8,
      borderTop: '1px solid #F0ECE6',
    }}>
      <div style={{ fontSize: 12.5, color: '#6B7B6E' }}>
        Showing <strong>{start + 1}–{Math.min(start + pageSize, total)}</strong> of{' '}
        <strong>{total}</strong> {noun}{total !== 1 ? 's' : ''}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <select
          value={pageSize}
          onChange={e => setPageSize(Number(e.target.value))}
          style={{ padding: '4px 8px', borderRadius: 6, border: '1.5px solid #E5DFD6', fontSize: 12, background: '#fff', cursor: 'pointer' }}
          title="Rows per page"
          aria-label="Rows per page"
        >
          {[10, 25, 50, 100].map(n => <option key={n} value={n}>{n} / page</option>)}
        </select>

        <button
          type="button"
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={currentPage === 1}
          style={{ ...pagerBtn, opacity: currentPage === 1 ? 0.4 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
        >
          ‹ Prev
        </button>

        {getPageNumbers(currentPage, totalPages).map((p, idx) =>
          p === '…' ? (
            <span key={`gap-${idx}`} style={{ fontSize: 12, color: '#aaa', padding: '0 4px' }}>…</span>
          ) : (
            <button
              type="button"
              key={p}
              onClick={() => goto(p)}
              aria-current={p === currentPage ? 'page' : undefined}
              style={{
                ...pagerBtn,
                background: p === currentPage ? '#2B5341' : '#fff',
                borderColor: p === currentPage ? '#2B5341' : '#E5DFD6',
                color:      p === currentPage ? '#fff' : '#333',
                fontWeight: p === currentPage ? 700 : 500,
              }}
            >
              {p}
            </button>
          )
        )}

        <button
          type="button"
          onClick={() => setPage(p => Math.min(totalPages, p + 1))}
          disabled={currentPage === totalPages}
          style={{ ...pagerBtn, opacity: currentPage === totalPages ? 0.4 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
        >
          Next ›
        </button>
      </div>
    </div>
  )
}

// Builds a compact page list like [1, '…', 4, 5, 6, '…', 12] around the current page.
function getPageNumbers(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages: (number | '…')[] = [1]
  const start = Math.max(2, current - 1)
  const end   = Math.min(total - 1, current + 1)

  if (start > 2) pages.push('…')
  for (let p = start; p <= end; p++) pages.push(p)
  if (end < total - 1) pages.push('…')
  pages.push(total)

  return pages
}

const pagerBtn: React.CSSProperties = {
  minWidth: 30, padding: '4px 9px', borderRadius: 6,
  border: '1.5px solid #E5DFD6', background: '#fff', color: '#333',
  fontSize: 12.5, cursor: 'pointer', lineHeight: 1.6,
}
