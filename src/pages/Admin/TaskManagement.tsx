import AdminLayout from './AdminLayout'
import TaskBoard from '../shared/TaskBoard'

export default function TaskManagement() {
  return <TaskBoard Layout={AdminLayout} roleLabel="Admin / Partner" />
}
