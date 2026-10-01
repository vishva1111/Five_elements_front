/** Lifecycle stage of a tree record — must match TREE_STAGES in backend/src/routes/partner.js. */
export const TREE_STAGES = ['Under plantation', 'Planted', 'Growing', 'Established', 'Needs care', 'Dead'] as const

export const DEFAULT_STAGE = 'Under plantation'

/** Badge colours per stage (background, text). */
export const STAGE_STYLE: Record<string, { bg: string; fg: string }> = {
  'Under plantation': { bg: '#FFF4E0', fg: '#8B5A00' },
  'Planted':          { bg: '#E8F1FB', fg: '#185FA5' },
  'Growing':          { bg: '#EAF3DE', fg: '#27500A' },
  'Established':      { bg: '#D9EBD2', fg: '#1C3A2B' },
  'Needs care':       { bg: '#FEF0E3', fg: '#8B3A00' },
  'Dead':             { bg: '#F4E4E4', fg: '#A32020' },
}
