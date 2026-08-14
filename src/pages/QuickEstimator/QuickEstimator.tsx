import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ArrowLeft } from 'lucide-react'
import Navbar from '../../components/layout/Navbar'
import Footer from '../../components/layout/Footer'
import PentagonIcon from '../../components/ui/PentagonIcon'
import './QuickEstimator.css'

const CATEGORIES = [
  {
    id: 'flight',
    emoji: '✈️',
    label: 'Flights',
    color: '#1E6091',
    question: 'How many return flights did you take this year?',
    options: [
      { label: 'None', value: 0 },
      { label: '1–2 short haul', value: 0.5 },
      { label: '1–2 long haul', value: 2.5 },
      { label: '3–5 flights', value: 4.5 },
      { label: '6+ flights', value: 9 },
    ],
  },
  {
    id: 'car',
    emoji: '🚗',
    label: 'Car travel',
    color: '#6B4226',
    question: 'How do you mainly get around?',
    options: [
      { label: 'No car / public transport', value: 0.2 },
      { label: 'Small petrol car', value: 1.5 },
      { label: 'Large petrol / diesel', value: 2.8 },
      { label: 'Hybrid', value: 1.0 },
      { label: 'Electric', value: 0.4 },
    ],
  },
  {
    id: 'home',
    emoji: '🏠',
    label: 'Home energy',
    color: '#2D6A4F',
    question: 'How is your home heated / powered?',
    options: [
      { label: 'Mostly renewable', value: 0.3 },
      { label: 'Mixed / average', value: 1.2 },
      { label: 'Gas central heating', value: 2.0 },
      { label: 'Oil / coal', value: 3.5 },
    ],
  },
  {
    id: 'diet',
    emoji: '🥗',
    label: 'Diet',
    color: '#40916C',
    question: 'What best describes your diet?',
    options: [
      { label: 'Vegan', value: 0.7 },
      { label: 'Vegetarian', value: 1.2 },
      { label: 'Flexitarian', value: 1.8 },
      { label: 'Meat most days', value: 2.5 },
      { label: 'Heavy meat eater', value: 3.3 },
    ],
  },
]

export default function QuickEstimator() {
  const [step, setStep]       = useState(0) // 0 = intro, 1-4 = categories, 5 = result
  const [answers, setAnswers] = useState<Record<string, number>>({})

  const totalSteps = CATEGORIES.length
  const isIntro = step === 0
  const isResult = step === totalSteps + 1
  const currentCat = CATEGORIES[step - 1]

  const totalTCO2e = Object.values(answers).reduce((sum: number, v: number) => sum + v, 0)
  const treesNeeded = Math.ceil(totalTCO2e / 0.017)

  function selectAnswer(catId: string, value: number) {
    const newAnswers = { ...answers, [catId]: value }
    setAnswers(newAnswers)
    if (step < totalSteps) {
      setTimeout(() => setStep(step + 1), 300)
    } else {
      setTimeout(() => setStep(totalSteps + 1), 300)
    }
  }

  return (
    <div className="quick-estimator">
      <Navbar />

      <div className="container quick-estimator__wrap">
        {/* Intro */}
        {isIntro && (
          <div className="quick-estimator__intro">
            <PentagonIcon emoji="📊" color="#2D6A4F" size={80} filled />
            <h1>Your footprint in 2 minutes</h1>
            <p>
              Answer 4 quick questions. Get a credible estimate of your annual carbon footprint — and see how many trees it takes to offset it.
            </p>
            <button className="btn btn-primary quick-estimator__start-btn" onClick={() => setStep(1)}>
              Start now <ArrowRight size={16} />
            </button>
            <p className="quick-estimator__note">No account needed. Takes under 2 minutes.</p>
          </div>
        )}

        {/* Category questions */}
        {!isIntro && !isResult && currentCat && (
          <div className="quick-estimator__question">
            {/* Progress */}
            <div className="quick-estimator__progress">
              <div className="quick-estimator__progress-bar">
                <div
                  className="quick-estimator__progress-fill"
                  style={{ width: `${((step - 1) / totalSteps) * 100}%` }}
                />
              </div>
              <span>{step} of {totalSteps}</span>
            </div>

            <div className="quick-estimator__cat-header">
              <PentagonIcon emoji={currentCat.emoji} color={currentCat.color} size={56} />
              <div>
                <p className="quick-estimator__cat-label">{currentCat.label}</p>
                <h2 className="quick-estimator__cat-question">{currentCat.question}</h2>
              </div>
            </div>

            <div className="quick-estimator__options">
              {currentCat.options.map((opt) => (
                <button
                  key={opt.label}
                  className={`quick-estimator__option ${answers[currentCat.id] === opt.value ? 'selected' : ''}`}
                  onClick={() => selectAnswer(currentCat.id, opt.value)}
                >
                  <span>{opt.label}</span>
                  <span className="quick-estimator__option-co2">{opt.value} tCO₂e</span>
                </button>
              ))}
            </div>

            {step > 1 && (
              <button className="quick-estimator__back" onClick={() => setStep(step - 1)}>
                <ArrowLeft size={14} /> Back
              </button>
            )}
          </div>
        )}

        {/* Result */}
        {isResult && (
          <div className="quick-estimator__result">
            <PentagonIcon emoji="🌍" color="#2D6A4F" size={80} filled />
            <h1>Your estimated footprint</h1>

            <div className="quick-estimator__result-num">
              <span className="quick-estimator__result-big">{totalTCO2e.toFixed(1)}</span>
              <span className="quick-estimator__result-unit">tCO₂e / year</span>
            </div>

            <div className="quick-estimator__result-breakdown">
              {CATEGORIES.map((cat) => (
                <div key={cat.id} className="quick-estimator__breakdown-row">
                  <span>{cat.emoji} {cat.label}</span>
                  <div className="quick-estimator__breakdown-bar-wrap">
                    <div
                      className="quick-estimator__breakdown-bar"
                      style={{
                        width: `${Math.min(100, ((answers[cat.id] || 0) / 10) * 100)}%`,
                        background: cat.color,
                      }}
                    />
                  </div>
                  <span className="quick-estimator__breakdown-val">{(answers[cat.id] || 0).toFixed(1)} t</span>
                </div>
              ))}
            </div>

            <div className="quick-estimator__trees-needed">
              <PentagonIcon emoji="🌳" color="#2D6A4F" size={48} />
              <div>
                <span className="quick-estimator__trees-num">{treesNeeded.toLocaleString()}</span>
                <span className="quick-estimator__trees-label">trees to offset your footprint</span>
              </div>
            </div>

            <div className="quick-estimator__result-btns">
              <Link
                to={`/fund?trees=${treesNeeded}`}
                className="btn btn-primary"
              >
                Fund {treesNeeded} trees →
              </Link>
              <Link to="/projects" className="btn btn-outline">Browse projects</Link>
              <button className="quick-estimator__restart" onClick={() => { setStep(0); setAnswers({}) }}>
                Start over
              </button>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  )
}