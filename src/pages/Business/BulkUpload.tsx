import React from 'react'
import ComingSoon from './ComingSoon'

export default function BulkUpload() {
  return (
    <ComingSoon
      icon="📤"
      title="Bulk upload"
      subtitle="Upload utility bills, fuel logs and travel records as CSV or Excel."
      points={[
        'Download a template, fill it in, upload it back',
        'Rows checked before anything is saved',
        'Imported data feeds your emissions inventory',
      ]}
    />
  )
}
