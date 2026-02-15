import type { BadgeVariant } from '../components/common/Badge'

export const USER_ROLES = {
  DEV: 'DEV',
  PM: 'PM',
  MANAGER: 'MANAGER',
  ADMIN: 'ADMIN',
} as const

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES]

export const ROLE_LEVELS: Record<UserRole, number> = {
  DEV: 1,
  PM: 2,
  MANAGER: 3,
  ADMIN: 4,
} as const

export const ROLE_OPTIONS: { value: UserRole; label: string; description: string }[] = [
  { value: 'DEV', label: 'Developer', description: 'Can view own worklogs and team data' },
  { value: 'PM', label: 'Project Manager', description: 'Can manage teams and view reports' },
  { value: 'MANAGER', label: 'Manager', description: 'Can manage users and billing' },
  { value: 'ADMIN', label: 'Admin', description: 'Full system access' },
]

export const ROLE_BADGE_VARIANTS: Record<UserRole, BadgeVariant> = {
  DEV: 'default',
  PM: 'success',
  MANAGER: 'info',
  ADMIN: 'error',
}

export function getRoleLevel(role: UserRole): number {
  return ROLE_LEVELS[role] ?? 0
}

export function canManageTeams(role: UserRole): boolean {
  return getRoleLevel(role) >= 2
}

export function canManageUsers(role: UserRole): boolean {
  return getRoleLevel(role) >= 3
}
