'use client';

import { useMemo } from 'react';
import type { PlanFeatures } from '@/services/platform.service';

export type FeatureKey = keyof PlanFeatures;

const DEFAULT_FEATURES: PlanFeatures = {
  crmAccess: false,
  analyticsAccess: false,
  apiAccess: false,
  multiBranchSupport: false,
  prioritySupport: false,
};

export function useFeatureAccess(features?: Partial<PlanFeatures>) {
  const merged = useMemo<PlanFeatures>(() => ({ ...DEFAULT_FEATURES, ...features }), [features]);

  return {
    features: merged,
    canAccess: (feature: FeatureKey) => Boolean(merged[feature]),
  };
}
