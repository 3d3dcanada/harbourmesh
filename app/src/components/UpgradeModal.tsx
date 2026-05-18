import { Check, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSubscriptionStore, type Feature, type SubscriptionTier } from '@/store/subscriptionStore';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  highlightFeature?: Feature;
}

const TIER_INFO: Record<SubscriptionTier, { name: string; price: string; annual: string; description: string }> = {
  free: { name: 'Skipper', price: 'Free', annual: '', description: '1 vessel, basic navigation' },
  pro: { name: 'Captain', price: '$15/mo', annual: '$149/yr', description: 'Full NMEA, weather routing, anchor watch' },
  fleet: { name: 'Admiral', price: '$39/mo', annual: '$399/yr', description: 'Fleet console, API access, compliance' },
};

const FEATURE_LABELS: Record<Feature, string> = {
  'anchor-watch': 'Anchor Watch Alarm',
  'full-nmea': 'Full NMEA 0183/2000',
  'signal-k': 'Signal K Integration',
  'weather-routing': 'Weather Routing',
  'departure-planner': 'Departure Planner',
  '3d-vessel': '3D Vessel Model',
  'deck-plan-download': 'Deck Plan Download',
  'fleet-tracking': 'Social Fleet Tracking',
  'mesh-networking': 'Mesh Networking',
  'route-optimization': 'Route Optimization',
  'offline-charts': 'Offline Chart Packs',
  'maintenance-templates': 'Maintenance Templates',
  'equipment-profiles': 'Equipment Profiles',
  'community-contribute': 'Community Contributions',
  'fleet-console': 'Fleet Console',
  'crew-manifests': 'Crew Manifests',
  'compliance-calendar': 'Compliance Calendar',
  'api-access': 'API Access',
  'white-label': 'White Label',
  'unlimited-storage': 'Unlimited Storage',
};

const PRO_FEATURES: Feature[] = [
  'anchor-watch', 'full-nmea', 'signal-k', 'weather-routing',
  'departure-planner', '3d-vessel', 'deck-plan-download', 'fleet-tracking',
  'mesh-networking', 'route-optimization', 'offline-charts',
  'maintenance-templates', 'equipment-profiles', 'community-contribute',
];

const FLEET_FEATURES: Feature[] = [
  'fleet-console', 'crew-manifests', 'compliance-calendar',
  'api-access', 'white-label', 'unlimited-storage',
];

function FeatureRow({ feature, included, highlight }: { feature: Feature; included: boolean; highlight: boolean }) {
  return (
    <div className={`flex items-center justify-between py-1 px-2 rounded text-sm ${highlight ? 'bg-primary/10 font-medium' : ''}`}>
      <span className="truncate">{FEATURE_LABELS[feature]}</span>
      {included ? (
        <Check className="h-4 w-4 text-emerald-500 shrink-0" />
      ) : (
        <X className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0" />
      )}
    </div>
  );
}

export function UpgradeModal({ open, onOpenChange, highlightFeature }: UpgradeModalProps) {
  const { setTier, startTrial, effectiveTier } = useSubscriptionStore();
  const currentTier = effectiveTier();

  const handleStartTrial = () => {
    startTrial(14);
    onOpenChange(false);
  };

  const handleUpgrade = (tier: SubscriptionTier) => {
    setTier(tier);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Upgrade HarborMesh</DialogTitle>
          <DialogDescription>
            Choose the plan that fits your vessel management needs
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          {/* Free Tier */}
          <Card className={currentTier === 'free' ? 'border-primary' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{TIER_INFO.free.name}</CardTitle>
              <div className="text-2xl font-bold">{TIER_INFO.free.price}</div>
              <p className="text-xs text-muted-foreground">{TIER_INFO.free.description}</p>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-xs text-muted-foreground mb-2">Basic features:</div>
              <div className="py-1 px-2 text-sm">1 vessel, 5 spaces</div>
              <div className="py-1 px-2 text-sm">Basic chart + GPS</div>
              <div className="py-1 px-2 text-sm">10 logs/month</div>
              <div className="py-1 px-2 text-sm">500MB storage</div>
              {currentTier === 'free' && (
                <Badge variant="outline" className="mt-3 w-full justify-center">Current Plan</Badge>
              )}
            </CardContent>
          </Card>

          {/* Pro Tier */}
          <Card className={`${currentTier === 'pro' ? 'border-primary' : 'border-primary/50'} relative`}>
            <Badge className="absolute -top-2 left-1/2 -translate-x-1/2">Most Popular</Badge>
            <CardHeader className="pb-2 pt-5">
              <CardTitle className="text-base">{TIER_INFO.pro.name}</CardTitle>
              <div className="text-2xl font-bold">{TIER_INFO.pro.price}</div>
              <p className="text-xs text-muted-foreground">{TIER_INFO.pro.annual} billed annually</p>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-xs text-muted-foreground mb-2">Everything in Free, plus:</div>
              {PRO_FEATURES.map((f) => (
                <FeatureRow key={f} feature={f} included highlight={f === highlightFeature} />
              ))}
              {currentTier === 'pro' ? (
                <Badge variant="outline" className="mt-3 w-full justify-center">Current Plan</Badge>
              ) : (
                <div className="flex flex-col gap-2 mt-3">
                  <Button size="sm" onClick={handleStartTrial} className="w-full">
                    Start 14-Day Trial
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => handleUpgrade('pro')} className="w-full">
                    Subscribe
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Fleet Tier */}
          <Card className={currentTier === 'fleet' ? 'border-primary' : ''}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{TIER_INFO.fleet.name}</CardTitle>
              <div className="text-2xl font-bold">{TIER_INFO.fleet.price}</div>
              <p className="text-xs text-muted-foreground">{TIER_INFO.fleet.annual} + $5/vessel</p>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="text-xs text-muted-foreground mb-2">Everything in Pro, plus:</div>
              {FLEET_FEATURES.map((f) => (
                <FeatureRow key={f} feature={f} included highlight={f === highlightFeature} />
              ))}
              {currentTier === 'fleet' ? (
                <Badge variant="outline" className="mt-3 w-full justify-center">Current Plan</Badge>
              ) : (
                <Button size="sm" variant="outline" onClick={() => handleUpgrade('fleet')} className="w-full mt-3">
                  Contact Sales
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
