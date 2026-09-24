/**
 * PartnerUsers — the Business/Individual accounts a partner onboards, split
 * out from Team management so they read as what they are: platform users
 * with their own dashboards, not internal staff. Same data, same actions
 * (invite, edit, deactivate, remove, record a tree for them), filtered to a
 * different scope of PartnerTeam.
 */
import { PartnerTeam } from './PartnerTeam'

export default function PartnerUsers() {
  return <PartnerTeam scope="users" />
}
