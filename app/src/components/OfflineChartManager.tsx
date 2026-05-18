import { useEffect, useState } from 'react';
import { Download, Trash2, HardDrive, Map, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  PREDEFINED_REGIONS,
  estimateRegionTileCount,
  downloadRegionTiles,
  getDownloadedRegions,
  saveRegion,
  deleteRegion,
  estimateStorageUsed,
  type OfflineRegion,
} from '@/lib/offline-charts';
import { FeatureGate } from './FeatureGate';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
  return `${(bytes / 1073741824).toFixed(1)} GB`;
}

export function OfflineChartManager() {
  const [regions, setRegions] = useState<OfflineRegion[]>([]);
  const [storageUsed, setStorageUsed] = useState(0);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [progress, setProgress] = useState({ downloaded: 0, total: 0 });

  useEffect(() => {
    setRegions(getDownloadedRegions());
    estimateStorageUsed().then(setStorageUsed);
  }, []);

  const handleDownload = async (index: number) => {
    const def = PREDEFINED_REGIONS[index];
    const id = `region-${def.name.toLowerCase().replace(/\s+/g, '-')}`;
    setDownloading(id);
    setProgress({ downloaded: 0, total: estimateRegionTileCount(def.bounds, def.minZoom, def.maxZoom) });

    try {
      const count = await downloadRegionTiles(
        def.bounds, def.minZoom, def.maxZoom,
        (d, t) => setProgress({ downloaded: d, total: t }),
      );

      const region: OfflineRegion = {
        id,
        name: def.name,
        bounds: def.bounds,
        minZoom: def.minZoom,
        maxZoom: def.maxZoom,
        tileCount: count,
        downloadedAt: new Date().toISOString(),
        sizeBytes: count * 20000,
      };

      saveRegion(region);
      setRegions(getDownloadedRegions());
      const used = await estimateStorageUsed();
      setStorageUsed(used);
    } finally {
      setDownloading(null);
    }
  };

  const handleDelete = async (regionId: string) => {
    await deleteRegion(regionId);
    setRegions(getDownloadedRegions());
    const used = await estimateStorageUsed();
    setStorageUsed(used);
  };

  const downloadedIds = new Set(regions.map((r) => r.id));

  return (
    <FeatureGate feature="offline-charts">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Map className="h-4 w-4" /> Offline Charts
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pb-3">
          {/* Storage Usage */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <HardDrive className="h-3.5 w-3.5" />
            <span>Storage used: {formatBytes(storageUsed)}</span>
          </div>

          {/* Download Progress */}
          {downloading && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Downloading... {progress.downloaded}/{progress.total} tiles</span>
              </div>
              <Progress value={progress.total > 0 ? (progress.downloaded / progress.total) * 100 : 0} className="h-1.5" />
            </div>
          )}

          {/* Available Regions */}
          <div className="space-y-2">
            {PREDEFINED_REGIONS.map((def, i) => {
              const id = `region-${def.name.toLowerCase().replace(/\s+/g, '-')}`;
              const isDownloaded = downloadedIds.has(id);
              const savedRegion = regions.find((r) => r.id === id);
              const tileCount = estimateRegionTileCount(def.bounds, def.minZoom, def.maxZoom);

              return (
                <div key={i} className="flex items-center justify-between p-2 rounded border">
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{def.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      ~{tileCount} tiles · z{def.minZoom}-{def.maxZoom}
                      {savedRegion && ` · ${formatBytes(savedRegion.sizeBytes)}`}
                    </p>
                  </div>
                  {isDownloaded ? (
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500/30">Saved</Badge>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleDelete(id)}>
                        <Trash2 className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      onClick={() => handleDownload(i)}
                      disabled={downloading !== null}
                    >
                      <Download className="h-3 w-3 mr-1" />
                      Save
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </FeatureGate>
  );
}
