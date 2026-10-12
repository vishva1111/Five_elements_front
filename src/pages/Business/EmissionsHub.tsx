import React from 'react'
import ComingSoon from './ComingSoon'

export default function EmissionsHub() {
  return (
    <ComingSoon
      icon="🏭"
      title="Emissions hub"
      subtitle="Measure your Scope 1, 2 and 3 emissions from real activity data."
      points={[
        'Scope 1, 2 and 3 inventory calculated with published emission factors',
        'Manual entry and bulk upload of fuel, electricity and travel data',
        'Emissions flow straight into your reports',
      ]}
    />
  )
}
