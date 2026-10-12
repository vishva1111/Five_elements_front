import React from 'react'
import ComingSoon from './ComingSoon'

export default function BusinessFundFlow() {
  return (
    <ComingSoon
      icon="🌳"
      title="Business funding"
      subtitle="Fund several projects at once and pay by card or invoice."
      points={[
        'Build a basket of verified projects',
        'Pay by card, or by invoice with a PO number',
        'Every funding written to your ledger and reports',
      ]}
    />
  )
}
