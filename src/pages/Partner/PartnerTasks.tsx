import PartnerLayout from './PartnerLayout'
import TaskBoard from '../shared/TaskBoard'

export default function PartnerTasks() {
  return <TaskBoard Layout={PartnerLayout} roleLabel="Admin / Partner" />
}
