import React from 'react'
import AdminLayout from './AdminLayout'
import ActivityReport from '../shared/ActivityReport'

export default function AdminActivityReport() {
  return <ActivityReport Layout={AdminLayout} role="admin" />
}
