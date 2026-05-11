import { SetMetadata } from '@nestjs/common';
import { FEATURE_KEYS, FeatureKey } from './feature-keys';

export const PLAN_FEATURE_KEY = 'planFeature';
export const RequirePlanFeature = (feature: FeatureKey | keyof typeof FEATURE_KEYS) =>
  SetMetadata(PLAN_FEATURE_KEY, feature);