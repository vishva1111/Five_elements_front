import React from 'react'
import AdminLayout from './AdminLayout'
import AuditSchedule from '../shared/AuditSchedule'

export default function AdminAuditSchedule() {
  return <AuditSchedule Layout={AdminLayout} role="admin" />
}
