import React, { useState } from 'react'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'
import './Business.css'

const SOURCES = ['Fuel combustion', 'Company vehicles', 'Purchased electricity', 'Business travel', 'Supply chain', 'Waste']

export default function SourceDataEntry() {
  const [source, setSource] = useState('')
  const [amount, setAmount] = useState('')
  const [unit, setUnit] = useState('litres')
  const [saved, setSaved] = useState(false)

  function handleSave(e) {
    e.preventDefault()
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="business-page">
      <Navbar />
      <div className="business-page__header dark-section">
        <div className="container">
          <p className="section-label" style={{ color: 'var(--color-accent)' }}>SOURCE DATA ENTRY</p>
          <h1 className="business-page__title">Add an emissions source</h1>
          <p className="business-page__sub">Enter activity data — we apply published emission factors automatically.</p>
        </div>
      </div>
      <div className="container business-page__body">
        <form className="business-page__form card" style={{ padding: 28 }} onSubmit={handleSave}>
          <div className="business-page__field">
            <label>Emissions source</label>
            <select className="business-page__select" value={source} onChange={e => setSource(e.target.value)} required>
              <option value="">Select a source…</option>
              {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div className="business-page__two-col">
            <div className="business-page__field">
              <label>Amount</label>
              <input className="business-page__input" type="number" placeholder="e.g. 500" value={amount} onChange={e => setAmount(e.target.value)} required />
            </div>
            <div className="business-page__field">
              <label>Unit</label>
              <select className="business-page__select" value={unit} onChange={e => setUnit(e.target.value)}>
                {['litres', 'kWh', 'km', 'kg', 'tonnes'].map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
          </div>
          <div className="business-page__field">
            <label>Notes (optional)</label>
            <textarea className="business-page__textarea" placeholder="e.g. January diesel consumption for Site A" />
          </div>
          <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
            {saved ? '✓ Saved' : 'Save entry'}
          </button>
        </form>
      </div>
      <Footer />
    </div>
  )
}