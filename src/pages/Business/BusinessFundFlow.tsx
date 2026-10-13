import React from 'react'
import BusinessLayout from './BusinessLayout'
import { FundFlowContent } from '../FundFlow/FundFlow'

// Same checkout as the Individual one, recorded as the organisation's funding
// (it shows in the Business dashboard, portfolio, ledger and reports).
export default function BusinessFundFlow() {
  return (
    <BusinessLayout title="Fund trees" subtitle="Funded by your organisation · pay securely">
      <FundFlowContent fundedAs="business" />
    </BusinessLayout>
  )
}
