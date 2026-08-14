export const ELEMENTS = [
  { id: 'earth', label: 'Earth', emoji: '🌍', color: '#2D6A4F', active: true },
  { id: 'water', label: 'Water', emoji: '💧', color: '#1E6091', active: false },
  { id: 'fire',  label: 'Fire',  emoji: '🔥', color: '#E76F51', active: false },
  { id: 'air',   label: 'Air',   emoji: '🌬️', color: '#8ECAE6', active: false },
  { id: 'ether', label: 'Ether', emoji: '✨', color: '#9B72CF', active: false },
]

export const CATEGORIES = [
  'All',
  'Afforestation & Land',
  'Reforestation',
  'Mangrove',
  'Agroforestry',
]

export const PRICE_RANGES = [
  { label: 'Any',       min: 0,   max: Infinity },
  { label: 'Under ₹100', min: 0,   max: 100 },
  { label: '₹100–130',  min: 100, max: 130 },
  { label: 'Over ₹130', min: 130, max: Infinity },
]