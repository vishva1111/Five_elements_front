import React from 'react'
import { ELEMENTS } from '../../constants/elements'
import PentagonIcon from './PentagonIcon'
import './ElementFilter.css'

export default function ElementFilter({ active, onChange }) {
  return (
    <div className="element-filter">
      {ELEMENTS.map((el) => (
        <button
          key={el.id}
          className={`element-filter__item ${active === el.id ? 'element-filter__item--active' : ''} ${!el.active ? 'element-filter__item--disabled' : ''}`}
          onClick={() => el.active && onChange(el.id)}
          disabled={!el.active}
          title={el.active ? el.label : `${el.label} — Coming soon`}
        >
          <PentagonIcon
            emoji={el.emoji}
            color={el.color}
            size={52}
            filled={active === el.id}
          />
          <span className="element-filter__label">{el.label}</span>
          {!el.active && (
            <span className="badge badge-coming-soon">Coming soon</span>
          )}
          {el.active && active === el.id && (
            <span className="element-filter__active-dot" />
          )}
        </button>
      ))}
    </div>
  )
}