export type Role = 'admin' | 'manager' | 'staff' | 'user';

export interface RequestUser {
  id: string;
  role: Role;
  organizationId: string;
  serviceUserId?: string;
}
