import { useState } from 'react';
import { Check, X, Anchor, Ship, Crown, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useSubscriptionStore, type Feature, type SubscriptionTier } from '@/store/subscriptionStore';
import { useAppStore } from '@/store';
import { cn } from '@/lib/utils';

const FEATURES: { feature: Feature; label: string; tier: SubscriptionTier }[] = [
  { feature: 'anchor-watch', label: 'Anchor Watch Alarm', tier: 'pro' },
  { feature: 'full-nmea', label: 'Full NMEA 0183/2000', tier: 'pro' },
  { feature: 'signal-k', label: 'Signal K Integration', tier: 'pro' },
  { feature: 'weather-routing', label: 'AI Weather Routing', tier: 'pro' },
  { feature: 'departure-planner', label: 'Departure Planner', tier: 'pro' },
  { feature: '3d-vessel', label: '3D Vessel Model', tier: 'pro' },
  { feature: 'deck-plan-download', label: 'Deck Plan Downloads', tier: 'pro' },
  { feature: 'fleet-tracking', label: 'Social Fleet Tracking', tier: 'pro' },
  { feature: 'mesh-networking', label: 'P2P Mesh Networking', tier: 'pro' },
  { feature: 'route-optimization', label: 'Route Optimization', tier: 'pro' },
  { feature: 'offline-charts', label: 'Offline Chart Packs', tier: 'pro' },
  { feature: 'maintenance-templates', label: '60+ Maintenance Templates', tier: 'pro' },
  { feature: 'equipment-profiles', label: 'Equipment Profiles', tier: 'pro' },
  { feature: 'community-contribute', label: 'Community Contributions', tier: 'pro' },
  { feature: 'fleet-console', label: 'Fleet Console', tier: 'fleet' },
  { feature: 'crew-manifests', label: 'Crew Manifests', tier: 'fleet' },
  { feature: 'compliance-calendar', label: 'Compliance Calendar', tier: 'fleet' },
  { feature: 'api-access', label: 'API Access', tier: 'fleet' },
  { feature: 'white-label', label: 'White Label Option', tier: 'fleet' },
  { feature: 'unlimited-storage', label: 'Unlimited Storage', tier: 'fleet' },
];

const TIER_RANK: Record<SubscriptionTier, number> = { free: 0, pro: 1, fleet: 2 };


const FAQ = [
  { q: 'Can I try Pro features before subscribing?', a: 'Yes. Start a 14-day free trial with full Pro access. No credit card required.' },
  { q: 'Does it work offline?', a: 'Yes. HarborMesh is a PWA that caches charts and data locally. Pro users can download chart packs for specific regions.' },
  { q: 'What hardware do I need?', a: 'Any modern phone, tablet, or laptop with a browser. For live sensor data, connect a Signal K server or NMEA-enabled chart plotter.' },
  { q: 'How does mesh networking work?', a: 'HarborMesh uses peer-to-peer mesh networking so nearby vessels can share positions, hazards, and depth data without internet.' },
  { q: 'Can I cancel anytime?', a: 'Yes. No contracts, no cancellation fees. Your data stays on your device.' },
];

const MONTHLY_PRICES = { free: 0, pro: 15, fleet: 39 };
const ANNUAL_PRICES = { free: 0, pro: 12.42, fleet: 33.25 };

export function Pricing() {
  const { setTier, startTrial, effectiveTier } = useSubscriptionStore();
  const { setActiveView } = useAppStore();
  const current = effectiveTier();
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly');

  const prices = billing === 'annual' ? ANNUAL_PRICES : MONTHLY_PRICES;

  const handleStartTrial = () => {
    startTrial(14);
    setActiveView('dashboard');
  };

  const handleSubscribe = (tier: SubscriptionTier) => {
    setTier(tier);
    setActiveView('dashboard');
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-12">
        {/* Hero */}
        <div className="text-center space-y-3">
          <h1 className="text-3xl font-bold tracking-tight">Navigate Smarter</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Complete vessel management, real-time navigation, and community intelligence.
            Everything a modern mariner needs in one app.
          </p>
        </div>

        {/* Social Proof */}
        <div className="flex items-center justify-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-muted-foreground">Join 2,400+ mariners</span>
        </div>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-3">
          <span className={cn('text-sm font-medium', billing === 'monthly' ? 'text-foreground' : 'text-muted-foreground')}>Monthly</span>
          <Switch
            checked={billing === 'annual'}
            onCheckedChange={(checked) => setBilling(checked ? 'annual' : 'monthly')}
          />
          <span className={cn('text-sm font-medium', billing === 'annual' ? 'text-foreground' : 'text-muted-foreground')}>
            Annual
          </span>
          {billing === 'annual' && (
            <Badge variant="secondary" className="text-xs">Save 17%</Badge>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {/* Free / Skipper */}
          <Card className={cn(
            'max-w-sm mx-auto w-full md:max-w-none',
            current === 'free' ? 'border-primary' : '',
          )}>
            <CardHeader className="text-center pb-2 p-6 md:p-8">
              <div className="mx-auto h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-2">
                <Anchor className="h-5 w-5" />
              </div>
              <CardTitle>Skipper</CardTitle>
              <div className="text-3xl font-bold">Free</div>
              <p className="text-sm text-muted-foreground">1 vessel, basic navigation</p>
            </CardHeader>
            <CardContent className="space-y-3 p-6 md:p-8 pt-0 md:pt-0">
              <ul className="space-y-3 text-sm leading-relaxed">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500 shrink-0" /> Basic chart + GPS</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500 shrink-0" /> 10 log entries/month</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500 shrink-0" /> 5 maintenance tasks</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500 shrink-0" /> Tide predictions</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500 shrink-0" /> 500MB storage</li>
              </ul>
              {current === 'free' ? (
                <Badge variant="outline" className="w-full justify-center h-12">Current Plan</Badge>
              ) : (
                <Button variant="outline" className="w-full h-12" onClick={() => handleSubscribe('free')}>Downgrade</Button>
              )}
            </CardContent>
          </Card>

          {/* Pro / Captain — Recommended */}
          <Card className={cn(
            'relative max-w-sm mx-auto w-full md:max-w-none md:scale-105',
            'border-2 border-primary bg-gradient-to-b from-primary/5 to-transparent',
          )}>
            <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2">Most Popular</Badge>
            <CardHeader className="text-center pb-2 pt-8 p-6 md:p-8">
              <div className="mx-auto h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Ship className="h-5 w-5 text-primary" />
              </div>
              <CardTitle>Captain</CardTitle>
              <div className="text-3xl font-bold">
                ${prices.pro.toFixed(prices.pro % 1 === 0 ? 0 : 2)}
                <span className="text-lg font-normal text-muted-foreground">/mo</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {billing === 'annual' ? 'Billed annually at $149/year' : 'or $149/year (save 17%)'}
              </p>
              {billing === 'annual' && (
                <Badge variant="secondary" className="mt-1">Saving $31/year</Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-3 p-6 md:p-8 pt-0 md:pt-0">
              <ul className="space-y-3 text-sm leading-relaxed">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500 shrink-0" /> Up to 3 vessels</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500 shrink-0" /> Anchor watch alarm</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500 shrink-0" /> Weather routing</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500 shrink-0" /> Departure planner</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500 shrink-0" /> Full NMEA + Signal K</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500 shrink-0" /> 3D vessel model</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500 shrink-0" /> Social fleet tracking</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500 shrink-0" /> 5GB storage</li>
              </ul>
              {current === 'pro' ? (
                <Badge variant="outline" className="w-full justify-center h-12">Current Plan</Badge>
              ) : (
                <div className="space-y-2">
                  <Button className="w-full h-12 bg-gradient-to-r from-primary to-cyan-600 hover:from-primary/90 hover:to-cyan-600/90" onClick={handleStartTrial}>
                    Start 14-Day Free Trial
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">No credit card required</p>
                  <Button variant="outline" className="w-full h-12" onClick={() => handleSubscribe('pro')}>Subscribe Now</Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Fleet / Admiral */}
          <Card className={cn(
            'max-w-sm mx-auto w-full md:max-w-none',
            current === 'fleet' ? 'border-primary' : '',
          )}>
            <CardHeader className="text-center pb-2 p-6 md:p-8">
              <div className="mx-auto h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-2">
                <Crown className="h-5 w-5" />
              </div>
              <CardTitle>Admiral</CardTitle>
              <div className="text-3xl font-bold">
                ${prices.fleet.toFixed(prices.fleet % 1 === 0 ? 0 : 2)}
                <span className="text-lg font-normal text-muted-foreground">/mo</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {billing === 'annual' ? 'Billed annually at $399/year + $5/vessel' : '$399/year + $5/vessel'}
              </p>
              {billing === 'annual' && (
                <Badge variant="secondary" className="mt-1">Saving $69/year</Badge>
              )}
            </CardHeader>
            <CardContent className="space-y-3 p-6 md:p-8 pt-0 md:pt-0">
              <ul className="space-y-3 text-sm leading-relaxed">
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500 shrink-0" /> Unlimited vessels</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500 shrink-0" /> Fleet console</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500 shrink-0" /> Crew manifests</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500 shrink-0" /> Compliance calendar</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500 shrink-0" /> API access</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500 shrink-0" /> White label option</li>
                <li className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-500 shrink-0" /> 50GB storage</li>
              </ul>
              {current === 'fleet' ? (
                <Badge variant="outline" className="w-full justify-center h-12">Current Plan</Badge>
              ) : (
                <Button variant="outline" className="w-full h-12" onClick={() => handleSubscribe('fleet')}>Contact Sales</Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Feature Comparison — Desktop: table, Mobile: accordion */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-center">Feature Comparison</h2>

          {/* Desktop Table */}
          <div className="hidden md:block border rounded-lg overflow-hidden">
            <div className="grid grid-cols-4 gap-0 bg-muted/50 px-4 py-3 text-xs font-medium sticky top-0">
              <div className="min-w-0">Feature</div>
              <div className="text-center">Skipper</div>
              <div className="text-center">Captain</div>
              <div className="text-center">Admiral</div>
            </div>
            {FEATURES.map(({ feature, label, tier }, i) => (
              <div key={feature} className={cn(
                'grid grid-cols-4 gap-0 px-4 py-2.5 border-t text-sm',
                i % 2 === 0 && 'bg-muted/30',
              )}>
                <div className="min-w-0 truncate">{label}</div>
                <div className="flex justify-center">
                  {TIER_RANK.free >= TIER_RANK[tier]
                    ? <Check className="h-4 w-4 text-emerald-500" />
                    : <X className="h-3.5 w-3.5 text-muted-foreground/30" />}
                </div>
                <div className="flex justify-center">
                  {TIER_RANK.pro >= TIER_RANK[tier]
                    ? <Check className="h-4 w-4 text-emerald-500" />
                    : <X className="h-3.5 w-3.5 text-muted-foreground/30" />}
                </div>
                <div className="flex justify-center">
                  <Check className="h-4 w-4 text-emerald-500" />
                </div>
              </div>
            ))}
          </div>

          {/* Mobile Accordion */}
          <div className="md:hidden">
            <Accordion type="single" collapsible className="space-y-2">
              <AccordionItem value="skipper" className="border rounded-lg px-4">
                <AccordionTrigger className="text-sm font-medium py-3">
                  What's included in Skipper?
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2 pb-2">
                    {FEATURES.map(({ feature, label, tier }) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        {TIER_RANK.free >= TIER_RANK[tier]
                          ? <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                          : <X className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />}
                        <span className={TIER_RANK.free >= TIER_RANK[tier] ? '' : 'text-muted-foreground'}>{label}</span>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="captain" className="border rounded-lg px-4 border-primary">
                <AccordionTrigger className="text-sm font-medium py-3">
                  What's included in Captain?
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2 pb-2">
                    {FEATURES.map(({ feature, label, tier }) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        {TIER_RANK.pro >= TIER_RANK[tier]
                          ? <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                          : <X className="h-3.5 w-3.5 text-muted-foreground/30 shrink-0" />}
                        <span className={TIER_RANK.pro >= TIER_RANK[tier] ? '' : 'text-muted-foreground'}>{label}</span>
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="admiral" className="border rounded-lg px-4">
                <AccordionTrigger className="text-sm font-medium py-3">
                  What's included in Admiral?
                </AccordionTrigger>
                <AccordionContent>
                  <ul className="space-y-2 pb-2">
                    {FEATURES.map(({ feature, label }) => (
                      <li key={feature} className="flex items-center gap-2 text-sm">
                        <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                        {label}
                      </li>
                    ))}
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-2xl mx-auto space-y-6">
          <h2 className="text-xl font-semibold text-center">Frequently Asked Questions</h2>
          <Accordion type="single" collapsible>
            {FAQ.map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-base text-left">{item.q}</AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </div>
  );
}
