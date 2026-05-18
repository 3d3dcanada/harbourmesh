import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SubscriptionTier = 'free' | 'pro' | 'fleet';

export interface SubscriptionLimits {
  maxVessels: number;
  maxSpaces: number;
  maxLogsPerMonth: number;
  maxTasks: number;
  maxStorageMB: number;
}

const TIER_LIMITS: Record<SubscriptionTier, SubscriptionLimits> = {
  free: { maxVessels: 1, maxSpaces: 5, maxLogsPerMonth: 10, maxTasks: 5, maxStorageMB: 500 },
  pro: { maxVessels: 3, maxSpaces: Infinity, maxLogsPerMonth: Infinity, maxTasks: Infinity, maxStorageMB: 5120 },
  fleet: { maxVessels: Infinity, maxSpaces: Infinity, maxLogsPerMonth: Infinity, maxTasks: Infinity, maxStorageMB: 51200 },
};

export type Feature =
  | 'anchor-watch'
  | 'full-nmea'
  | 'signal-k'
  | 'weather-routing'
  | 'departure-planner'
  | '3d-vessel'
  | 'deck-plan-download'
  | 'fleet-tracking'
  | 'mesh-networking'
  | 'route-optimization'
  | 'offline-charts'
  | 'maintenance-templates'
  | 'equipment-profiles'
  | 'community-contribute'
  | 'fleet-console'
  | 'crew-manifests'
  | 'compliance-calendar'
  | 'api-access'
  | 'white-label'
  | 'unlimited-storage';

const FEATURE_TIERS: Record<Feature, SubscriptionTier> = {
  'anchor-watch': 'pro',
  'full-nmea': 'pro',
  'signal-k': 'pro',
  'weather-routing': 'pro',
  'departure-planner': 'pro',
  '3d-vessel': 'pro',
  'deck-plan-download': 'pro',
  'fleet-tracking': 'pro',
  'mesh-networking': 'pro',
  'route-optimization': 'pro',
  'offline-charts': 'pro',
  'maintenance-templates': 'pro',
  'equipment-profiles': 'pro',
  'community-contribute': 'pro',
  'fleet-console': 'fleet',
  'crew-manifests': 'fleet',
  'compliance-calendar': 'fleet',
  'api-access': 'fleet',
  'white-label': 'fleet',
  'unlimited-storage': 'fleet',
};

const TIER_RANK: Record<SubscriptionTier, number> = { free: 0, pro: 1, fleet: 2 };

interface SubscriptionStore {
  tier: SubscriptionTier;
  trialEndsAt: string | null;
  subscribedAt: string | null;

  setTier: (tier: SubscriptionTier) => void;
  startTrial: (durationDays?: number) => void;
  endTrial: () => void;

  hasFeature: (feature: Feature) => boolean;
  requiredTier: (feature: Feature) => SubscriptionTier;
  limits: () => SubscriptionLimits;
  isTrialActive: () => boolean;
  effectiveTier: () => SubscriptionTier;
}

export const useSubscriptionStore = create<SubscriptionStore>()(
  persist(
    (set, get) => ({
      tier: 'free',
      trialEndsAt: null,
      subscribedAt: null,

      setTier: (tier) => set({ tier, subscribedAt: new Date().toISOString() }),

      startTrial: (durationDays = 14) => {
        const end = new Date();
        end.setDate(end.getDate() + durationDays);
        set({ trialEndsAt: end.toISOString() });
      },

      endTrial: () => set({ trialEndsAt: null }),

      isTrialActive: () => {
        const { trialEndsAt } = get();
        if (!trialEndsAt) return false;
        return new Date(trialEndsAt) > new Date();
      },

      effectiveTier: () => {
        const { tier, trialEndsAt } = get();
        if (tier !== 'free') return tier;
        if (trialEndsAt && new Date(trialEndsAt) > new Date()) return 'pro';
        return 'free';
      },

      hasFeature: (feature) => {
        const required = FEATURE_TIERS[feature];
        if (!required) return true;
        const effective = get().effectiveTier();
        return TIER_RANK[effective] >= TIER_RANK[required];
      },

      requiredTier: (feature) => FEATURE_TIERS[feature] ?? 'free',

      limits: () => TIER_LIMITS[get().effectiveTier()],
    }),
    {
      name: 'harbormesh-subscription',
      partialize: (state) => ({
        tier: state.tier,
        trialEndsAt: state.trialEndsAt,
        subscribedAt: state.subscribedAt,
      }),
    }
  )
);
