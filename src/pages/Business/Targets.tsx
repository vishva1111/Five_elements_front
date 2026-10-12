import React from 'react'
import ComingSoon from './ComingSoon'

export default function Targets() {
  return (
    <ComingSoon
      icon="🎯"
      title="Targets"
      subtitle="Set science-based and net-zero targets and track progress against them."
      points={[
        'Pick a baseline year and a reduction target',
        'Progress tracked from your measured emissions',
        'Targets shown on your dashboard and reports',
      ]}
    />
  )
}
