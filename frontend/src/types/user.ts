import type { UserRole } from '../constants/roles'

export interface User {
  id: number
  email: string
  name: string
  role: UserRole
  role_level: number
  company_id: number
}

export interface Team {
  name: string
  description?: string
  member_count: number
  total_hours: number
  expected_hours: number
  owner_id: number | null
  owner_email: string | null
  owner_name: string | null
  owner_role: UserRole | null
}
