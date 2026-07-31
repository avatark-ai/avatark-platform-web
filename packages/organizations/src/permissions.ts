// Design-reference capability model for organization roles. This is NOT
// currently enforced anywhere in this repo -- no code branches on
// organization_members.role beyond display today. Kept separate from any
// "real" data source and labeled as a reference in the UI, so the
// Permissions view never implies an enforcement guarantee that doesn't
// exist yet.
export interface RoleCapability {
  role: string
  capabilities: string[]
}

export const ORG_ROLE_CAPABILITY_REFERENCE: RoleCapability[] = [
  {
    role: 'owner',
    capabilities: [
      'Manage organization details',
      'Invite and remove members',
      'Assign member roles',
      'View organization audit history',
    ],
  },
  {
    role: 'admin',
    capabilities: ['Invite and remove members', 'Assign member roles', 'View organization audit history'],
  },
  {
    role: 'member',
    capabilities: ['View organization and its members'],
  },
]
