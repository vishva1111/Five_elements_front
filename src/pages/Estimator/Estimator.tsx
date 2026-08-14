import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'
import { FOOTPRINT_FACTORS } from '../../constants/mockData'
import './Estimator.css'

const STEPS = ['category', 'inputs', 'result']

const CATEGORIES = [
  { id: 'flight', label: 'Flight', emoji: '✈️', desc: 'Domestic or international flights' },
  { id: 'car', label: 'Car', emoji: '🚗', desc: 'Petrol, diesel or electric vehicle' },
  { id: 'homeEnergy', label: 'Home energy', emoji: '🏠', desc: 'Electricity and gas usage' },
  { id: 'diet', label: 'Diet', emoji: '🥗', desc: 'Annual food footprint' },
]

export default function Estimator() {
  const [step, setStep]         = useState(0)
  const [category, setCategory] = useState<string | null>(null)
  const [inputs, setInputs]     = useState<Record<string, string>>({})
  const [result, setResult]     = useState<{ tCO2e: string; trees: number } | null>(null)

  function handleCategorySelect(cat) {
    setCategory(cat)
    setInputs({})
    setStep(1)
  }

  function calculateFootprint() {
    let tCO2e = 0

    if (category === 'flight') {
      const hours = parseFloat(inputs.hours || '0')
      const type = (inputs.type || 'domestic') as keyof typeof FOOTPRINT_FACTORS.flight
      tCO2e = hours * FOOTPRINT_FACTORS.flight[type]
    } else if (category === 'car') {
      const km = parseFloat(inputs.km || '0')
      const fuel = (inputs.fuel || 'petrol') as keyof typeof FOOTPRINT_FACTORS.car
      tCO2e = (km / 1000) * FOOTPRINT_FACTORS.car[fuel]
    } else if (category === 'homeEnergy') {
      const units = parseFloat(inputs.units || '0')
      tCO2e = units * FOOTPRINT_FACTORS.homeEnergy.perUnit
    } else if (category === 'diet') {
      const type = (inputs.dietType || 'omnivore') as keyof typeof FOOTPRINT_FACTORS.diet
      tCO2e = FOOTPRINT_FACTORS.diet[type]
    }

    const trees = Math.ceil(tCO2e / 0.013) // ~13kg CO2 per tree per year
    setResult({ tCO2e: tCO2e.toFixed(2), trees })
    setStep(2)
  }

  function reset() {
    setStep(0)
    setCategory(null)
    setInputs({})
    setResult(null)
  }

  return (
    <div className="estimator">
      <Navbar />

      <div className="estimator__wrap">
        <div className="estimator__card card">
          {/* Step dots */}
          <div className="estimator__dots">
            {STEPS.map((_, i) => (
              <div key={i} className={`estimator__dot ${i <= step ? 'estimator__dot--active' : ''}`} />
            ))}
          </div>

          {/* Step 0: Category */}
          {step === 0 && (
            <div className="estimator__step">
              <h2 className="estimator__heading">What would you like to measure?</h2>
              <p className="estimator__sub">A credible estimate in under two minutes. No account needed.</p>
              <div className="estimator__categories">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.id}
                    className="estimator__cat-btn"
                    onClick={() => handleCategorySelect(cat.id)}
                  >
                    <div className="estimator__cat-icon">{cat.emoji}</div>
                    <span className="estimator__cat-label">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 1: Inputs */}
          {step === 1 && (
            <div className="estimator__step">
              <button className="estimator__back-btn" onClick={() => setStep(0)}>← Back</button>
              <h2 className="estimator__heading">
                {CATEGORIES.find((c) => c.id === category)?.emoji}{' '}
                {CATEGORIES.find((c) => c.id === category)?.label}
              </h2>

              {category === 'flight' && (
                <div className="estimator__inputs">
                  <div className="estimator__field">
                    <label>Flight type</label>
                    <div className="estimator__radio-group">
                      {['domestic', 'international'].map((t) => (
                        <label key={t} className="estimator__radio">
                          <input
                            type="radio"
                            name="type"
                            value={t}
                            checked={inputs.type === t}
                            onChange={(e) => setInputs({ ...inputs, type: e.target.value })}
                          />
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="estimator__field">
                    <label>Total flight hours</label>
                    <input
                      type="number"
                      placeholder="e.g. 12"
                      className="estimator__input"
                      value={inputs.hours || ''}
                      onChange={(e) => setInputs({ ...inputs, hours: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {category === 'car' && (
                <div className="estimator__inputs">
                  <div className="estimator__field">
                    <label>Fuel type</label>
                    <div className="estimator__radio-group">
                      {['petrol', 'diesel', 'electric'].map((t) => (
                        <label key={t} className="estimator__radio">
                          <input
                            type="radio"
                            name="fuel"
                            value={t}
                            checked={inputs.fuel === t}
                            onChange={(e) => setInputs({ ...inputs, fuel: e.target.value })}
                          />
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="estimator__field">
                    <label>Distance driven (km/year)</label>
                    <input
                      type="number"
                      placeholder="e.g. 15000"
                      className="estimator__input"
                      value={inputs.km || ''}
                      onChange={(e) => setInputs({ ...inputs, km: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {category === 'homeEnergy' && (
                <div className="estimator__inputs">
                  <div className="estimator__field">
                    <label>Monthly electricity usage (kWh)</label>
                    <input
                      type="number"
                      placeholder="e.g. 300"
                      className="estimator__input"
                      value={inputs.units || ''}
                      onChange={(e) => setInputs({ ...inputs, units: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {category === 'diet' && (
                <div className="estimator__inputs">
                  <div className="estimator__field">
                    <label>Diet type</label>
                    <div className="estimator__radio-group estimator__radio-group--col">
                      {[
                        { value: 'vegan', label: '🌱 Vegan' },
                        { value: 'vegetarian', label: '🥦 Vegetarian' },
                        { value: 'omnivore', label: '🍗 Omnivore' },
                        { value: 'heavyMeat', label: '🥩 Heavy meat eater' },
                      ].map((d) => (
                        <label key={d.value} className="estimator__radio">
                          <input
                            type="radio"
                            name="dietType"
                            value={d.value}
                            checked={inputs.dietType === d.value}
                            onChange={(e) => setInputs({ ...inputs, dietType: e.target.value })}
                          />
                          {d.label}
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <button className="btn btn-primary estimator__calc-btn" onClick={calculateFootprint}>
                Calculate my footprint →
              </button>
            </div>
          )}

          {/* Step 2: Result */}
          {step === 2 && result && (
            <div className="estimator__step estimator__result">
              <h2 className="estimator__heading">Your footprint estimate</h2>
              <div className="estimator__result-stat">
                <span className="estimator__result-num">{result.tCO2e}</span>
                <span className="estimator__result-unit">tCO₂e</span>
              </div>
              <p className="estimator__result-trees">
                ≈ <strong>{result.trees} trees</strong> needed to offset this over one year
              </p>
              <p className="estimator__result-note">
                This is a credible first estimate using published emission factors. Real impact requires funding verified projects.
              </p>
              <div className="estimator__result-actions">
                <Link to="/projects" className="btn btn-primary">
                  🌍 Fund a project
                </Link>
                <button className="btn btn-outline" onClick={reset}>
                  Measure something else
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  )
}