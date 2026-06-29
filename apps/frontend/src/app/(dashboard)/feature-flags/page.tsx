'use client';

import { PlatformPlaceholderPage } from '@/features/platform/components/PlatformPlaceholderPage';

export default function FeatureFlagsPage() {
  return (
    <PlatformPlaceholderPage
      title="Feature Flags"
      subtitle="Prepare per-tenant feature toggles, rollout controls, and beta access management."
      focus={['Tenant flags', 'Beta access', 'Gradual rollout', 'Kill switches', 'Feature audit']}
    />
  );
}
