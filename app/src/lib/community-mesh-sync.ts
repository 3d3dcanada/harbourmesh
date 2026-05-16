import { useCommunityDataStore } from '@/store';
import { useMeshStore } from '@/store/meshStore';
import { SharePositionLevel } from '@/types';
import type { GunInstance } from './gun-instance';
import type { RawDepthSounding } from './community-soundings';
import type { CommunitySyncBatch, CommunityHazard } from '@/store';

const SOUNDINGS_PATH = 'community/soundings/v1';
const HAZARDS_PATH = 'community/hazards/v1';

class CommunityMeshSync {
  private gun: GunInstance | null = null;

  init(gun: GunInstance | null) {
    if (!gun) return;
    this.gun = gun;
    this.subscribeInbound();
    useMeshStore.getState().setCommunityDataSyncActive(true);
  }

  publishSoundings(batch: CommunitySyncBatch) {
    if (!this.gun) return;
    const node = this.gun.get(SOUNDINGS_PATH);
    for (const record of batch.payload.records) {
      node.get(record.id).put({
        _schema: 'harbourmesh.community-soundings.v1',
        _published: Date.now(),
        depthMeters: record.depthMeters,
        lat: record.latitude,
        lon: record.longitude,
        ts: new Date(record.timestamp).getTime(),
        vesselId: record.vesselId,
        confidence: record.quality?.confidence ?? 0,
      });
    }
  }

  publishHazard(hazard: CommunityHazard) {
    if (!this.gun) return;
    this.gun.get(HAZARDS_PATH).get(hazard.id).put({
      _schema: 'harbourmesh.community-hazards.v1',
      _published: Date.now(),
      type: hazard.type,
      severity: hazard.severity,
      description: hazard.description,
      lat: hazard.position?.latitude ?? null,
      lon: hazard.position?.longitude ?? null,
      reportedAt: hazard.reportedAt,
      vesselId: hazard.vesselId,
    });
  }

  private subscribeInbound() {
    this.gun
      ?.get(SOUNDINGS_PATH)
      .map()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on((data: any, id: string) => {
        if (!data || data._deleted) return;
        const sounding = this.gunNodeToSounding(data, id);
        if (sounding) {
          useCommunityDataStore.getState().addRawSoundingsFromMesh([sounding]);
        }
      });

    this.gun
      ?.get(HAZARDS_PATH)
      .map()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on((data: any, id: string) => {
        if (!data || data._deleted) return;
        const hazard = this.gunNodeToHazard(data, id);
        if (hazard) {
          useCommunityDataStore.getState().mergePeerHazard(hazard);
        }
      });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private gunNodeToSounding(data: any, id: string): RawDepthSounding | null {
    try {
      if (typeof data.lat !== 'number' || typeof data.lon !== 'number') return null;
      if (typeof data.depthMeters !== 'number') return null;
      if ((data.confidence as number) < 0.35) return null;

      const now = new Date().toISOString();
      return {
        id,
        vesselId: (data.vesselId as string) ?? 'unknown',
        sourceDeviceId: (data.vesselId as string) ?? 'unknown',
        sourceProtocol: 'manual',
        rawMessageId: id,
        timestamp: data.ts ? new Date(data.ts as number).toISOString() : now,
        receivedAt: now,
        position: {
          latitude: data.lat as number,
          longitude: data.lon as number,
          accuracyMeters: undefined,
        },
        rawDepthMeters: data.depthMeters as number,
        depthMeters: data.depthMeters as number,
        depthReference: 'below_surface',
        tideCorrectionApplied: false,
        waterLevelCorrectionApplied: false,
        offsets: { surfaceToTransducerMeters: 0, transducerToKeelMeters: 0 },
        consent: {
          shareTelemetryForCommunity: true,
          shareLivePosition: SharePositionLevel.FULL,
          telemetryAnonymization: 'none',
          capturedAt: now,
        },
        sharing: {
          state: 'shareable_full',
          uploadLatitude: data.lat as number,
          uploadLongitude: data.lon as number,
        },
        quality: {
          confidence: (data.confidence as number) ?? 0.5,
          rejected: false,
          flags: [],
        },
      } satisfies RawDepthSounding;
    } catch {
      return null;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private gunNodeToHazard(data: any, id: string): CommunityHazard | null {
    try {
      const validTypes = ['traffic', 'weather', 'obstruction', 'shoal', 'debris', 'other'] as const;
      const validSeverities = ['low', 'medium', 'high'] as const;
      if (!validTypes.includes(data.type)) return null;
      if (!validSeverities.includes(data.severity)) return null;

      const hazard: CommunityHazard = {
        id,
        vesselId: (data.vesselId as string) ?? 'unknown',
        type: data.type as CommunityHazard['type'],
        severity: data.severity as CommunityHazard['severity'],
        description: (data.description as string) ?? '',
        reportedAt: (data.reportedAt as string) ?? new Date().toISOString(),
        status: 'local',
      };

      if (typeof data.lat === 'number' && typeof data.lon === 'number') {
        hazard.position = {
          latitude: data.lat as number,
          longitude: data.lon as number,
          source: 'manual',
          timestamp: (data.reportedAt as string) ?? new Date().toISOString(),
        };
      }

      return hazard;
    } catch {
      return null;
    }
  }
}

export const communityMeshSync = new CommunityMeshSync();
