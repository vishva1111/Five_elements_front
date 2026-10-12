import React from 'react'
import ComingSoon from './ComingSoon'

export default function SourceDataEntry() {
  return (
    <ComingSoon
      icon="📝"
      title="Source data entry"
      subtitle="Add activity data — fuel, electricity, travel — one record at a time."
      points={[
        'Pick a source, enter the amount and unit',
        'Emission factors applied automatically',
        'Every number traceable back to its record',
      ]}
    />
  )
}
