import { useEffect, useState } from 'react';
import { Megaphone, Tag, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import changelogData from '@/data/changelog.json';

declare const __APP_VERSION__: string;

const LAST_SEEN_VERSION_KEY = 'harbormesh-last-seen-version';

export function Updates() {
  const currentVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '0.0.0';
  const [lastSeenVersion, setLastSeenVersion] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(LAST_SEEN_VERSION_KEY);
    setLastSeenVersion(stored);
    localStorage.setItem(LAST_SEEN_VERSION_KEY, currentVersion);
  }, [currentVersion]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Megaphone className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Updates</h2>
            <p className="text-sm text-muted-foreground">
              Current version: <span className="font-mono font-medium">{currentVersion}</span>
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {changelogData.map((release, index) => {
          const isNew = lastSeenVersion !== null && release.version > lastSeenVersion;
          const isCurrent = release.version === currentVersion;

          return (
            <Card key={release.version} className={isNew ? 'border-primary/50' : ''}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Tag className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-base font-mono">v{release.version}</CardTitle>
                    {isCurrent && <Badge variant="secondary">Current</Badge>}
                    {isNew && (
                      <Badge className="bg-primary text-primary-foreground">
                        <Sparkles className="h-3 w-3 mr-1" />
                        New
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{release.date}</span>
                </div>
                <p className="text-sm font-medium mt-1">{release.title}</p>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {release.entries.map((entry, entryIndex) => (
                    <li key={entryIndex} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <span className="text-primary mt-1.5 h-1.5 w-1.5 rounded-full bg-current flex-shrink-0" />
                      {entry}
                    </li>
                  ))}
                </ul>
              </CardContent>
              {index < changelogData.length - 1 && <Separator />}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
