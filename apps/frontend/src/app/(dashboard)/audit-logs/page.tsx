'use client';

import { PlatformPlaceholderPage } from '@/features/platform/components/PlatformPlaceholderPage';

export default function AuditLogsPage() {
  return (
    <PlatformPlaceholderPage
      title="Audit Logs"
      subtitle="Review platform activity, tenant administration, impersonation, and security events."
      focus={['Platform actions', 'Tenant changes', 'Impersonation events', 'Security events', 'Exportable audit trail']}
    />
  );
}
