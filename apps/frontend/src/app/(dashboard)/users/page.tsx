'use client';

import { PlatformPlaceholderPage } from '@/features/platform/components/PlatformPlaceholderPage';

export default function PlatformUsersPage() {
  return (
    <PlatformPlaceholderPage
      title="Users"
      subtitle="Platform-level user visibility across tenants, roles, sessions, and access state."
      focus={['Platform users', 'Tenant owners', 'Role distribution', 'Active sessions', 'Access reviews']}
    />
  );
}
