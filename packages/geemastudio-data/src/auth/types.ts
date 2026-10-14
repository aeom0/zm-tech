export type Role = 'dev' | 'owner' | 'staff'

export interface AuthProfile {
  id: string
  role: Role
  employee_id: string | null
  full_name: string | null
  avatar_url: string | null
  tenant_id?: string | null
}

export function isAdminRole(role: Role | null | undefined): boolean {
  return role === 'dev' || role === 'owner'
}
