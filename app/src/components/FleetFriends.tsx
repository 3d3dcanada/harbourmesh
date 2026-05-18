import { useState } from 'react';
import { Users, UserPlus, Copy, Check, MapPin, Clock, Shield } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useSocialStore, type PositionPrivacy } from '@/store/socialStore';
import { FeatureGate } from './FeatureGate';

const PRIVACY_OPTIONS: { value: PositionPrivacy; label: string; description: string }[] = [
  { value: 'off', label: 'Hidden', description: 'Position not shared' },
  { value: 'blurred', label: 'Blurred', description: '~1km accuracy' },
  { value: 'full', label: 'Precise', description: 'Exact position' },
];

export function FleetFriends() {
  const {
    friends, inviteCode, privacyLevel, activities,
    generateNewInviteCode, setPrivacyLevel, addFriend,
  } = useSocialStore();

  const [codeInput, setCodeInput] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerateCode = () => {
    generateNewInviteCode();
  };

  const handleCopyCode = async () => {
    if (!inviteCode) return;
    await navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAcceptCode = () => {
    if (codeInput.length !== 6) return;
    addFriend({
      id: crypto.randomUUID(),
      name: `Friend (${codeInput})`,
      addedAt: new Date().toISOString(),
      online: false,
      lastSeen: null,
      position: null,
    });
    setCodeInput('');
  };

  return (
    <FeatureGate feature="fleet-tracking">
      <div className="space-y-4">
        {/* Privacy Setting */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4" /> Position Privacy
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            <div className="flex gap-2">
              {PRIVACY_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  size="sm"
                  variant={privacyLevel === opt.value ? 'default' : 'outline'}
                  className="flex-1 text-xs"
                  onClick={() => setPrivacyLevel(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground mt-1.5">
              {PRIVACY_OPTIONS.find((o) => o.value === privacyLevel)?.description}
            </p>
          </CardContent>
        </Card>

        {/* Invite Code */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <UserPlus className="h-4 w-4" /> Invite Friends
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pb-3">
            {inviteCode ? (
              <div className="flex items-center gap-2">
                <code className="flex-1 text-center text-lg font-mono font-bold tracking-widest bg-muted rounded p-2">
                  {inviteCode}
                </code>
                <Button size="icon" variant="outline" className="h-10 w-10" onClick={handleCopyCode}>
                  {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            ) : (
              <Button size="sm" className="w-full" onClick={handleGenerateCode}>
                Generate Invite Code
              </Button>
            )}

            <div className="flex gap-2">
              <input
                type="text"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.toUpperCase().slice(0, 6))}
                placeholder="Enter code"
                className="flex-1 h-8 px-2 text-sm font-mono uppercase tracking-widest rounded-md border bg-background text-center"
                maxLength={6}
              />
              <Button size="sm" variant="outline" onClick={handleAcceptCode} disabled={codeInput.length !== 6}>
                Join
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Friends List */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" /> Fleet ({friends.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            {friends.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">
                No friends yet. Generate or enter an invite code to connect.
              </p>
            ) : (
              <div className="space-y-2">
                {friends.map((friend) => (
                  <div key={friend.id} className="flex items-center gap-3 p-2 rounded-lg border">
                    <div className={cn('h-2 w-2 rounded-full', friend.online ? 'bg-emerald-500' : 'bg-muted-foreground/30')} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{friend.name}</p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        {friend.position ? (
                          <span className="flex items-center gap-0.5">
                            <MapPin className="h-2.5 w-2.5" />
                            {friend.position.latitude.toFixed(2)}, {friend.position.longitude.toFixed(2)}
                          </span>
                        ) : (
                          <span>No position</span>
                        )}
                        {friend.lastSeen && (
                          <span className="flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            {new Date(friend.lastSeen).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                      </div>
                    </div>
                    <Badge variant={friend.online ? 'default' : 'outline'} className="text-[10px]">
                      {friend.online ? 'Online' : 'Offline'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Feed */}
        {activities.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Activity Feed</CardTitle>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {activities.slice(0, 20).map((activity) => (
                  <div key={activity.id} className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{activity.friendName}</span>{' '}
                    {activity.message}
                    <span className="ml-1 text-[10px]">
                      {new Date(activity.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </FeatureGate>
  );
}
