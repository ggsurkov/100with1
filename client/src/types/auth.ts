export type UserRole = 'admin' | 'master' | 'editor' | 'member';
export type Permission = 'CREATE' | 'EDIT' | 'VIEW';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
}

export const DEFAULT_PERMISSIONS_BY_ROLE: Record<UserRole, Permission[]> = {
  admin: ['CREATE', 'EDIT', 'VIEW'],
  master: ['CREATE', 'EDIT', 'VIEW'],
  editor: ['EDIT', 'VIEW'],
  member: ['VIEW'],
};
