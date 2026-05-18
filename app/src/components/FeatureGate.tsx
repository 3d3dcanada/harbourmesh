import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSubscriptionStore, type Feature } from '@/store/subscriptionStore';
import { UpgradeModal } from './UpgradeModal';

interface FeatureGateProps {
  feature: Feature;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureGate({ feature, children, fallback }: FeatureGateProps) {
  const hasFeature = useSubscriptionStore((s) => s.hasFeature);
  const requiredTier = useSubscriptionStore((s) => s.requiredTier);
  const [showUpgrade, setShowUpgrade] = useState(false);

  if (hasFeature(feature)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  const tier = requiredTier(feature);
  const label = tier === 'fleet' ? 'Fleet Feature' : 'Pro Feature';

  return (
    <>
      <div className="relative rounded-lg overflow-hidden">
        <div className="pointer-events-none select-none blur-[2px] opacity-60">
          {children}
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/60 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <Badge variant="secondary">{label}</Badge>
          </div>
          <Button
            size="sm"
            onClick={() => setShowUpgrade(true)}
            className="pointer-events-auto"
          >
            Unlock
          </Button>
        </div>
      </div>
      <UpgradeModal
        open={showUpgrade}
        onOpenChange={setShowUpgrade}
        highlightFeature={feature}
      />
    </>
  );
}
