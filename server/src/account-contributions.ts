import type { CommunityAggregateReleaseRepository } from './community-aggregate-release-repository.js';
import type { CommunityHazardRepository, StoredCommunityHazard } from './community-hazard-repository.js';
import type { CommunityObservationRepository, StoredCommunityObservation } from './community-observation-repository.js';
import type { CommunityAggregateReleaseManifest } from './community-release-manifests.js';
import type { CommunitySoundingRepository, StoredCommunitySounding } from './community-sounding-repository.js';

export type AccountCommunityContributionKind = 'sounding' | 'hazard' | 'observation' | 'aggregate_release';

export type AccountCommunityContributionItem = {
  id: string;
  kind: AccountCommunityContributionKind;
  region?: string;
  status?: string;
  reviewStatus?: string;
  createdAt: string;
};

export type AccountCommunityContributionSummary = {
  totalRecords: number;
  soundings: number;
  hazards: number;
  observations: number;
  aggregateReleases: number;
  byReviewStatus: Record<string, number>;
};

export type AccountCommunityContributions = {
  ok: true;
  accountId: string;
  generatedAt: string;
  summary: AccountCommunityContributionSummary;
  recentItems: AccountCommunityContributionItem[];
};

export type AccountCommunityContributionRepositories = {
  soundings: CommunitySoundingRepository;
  hazards: CommunityHazardRepository;
  observations: CommunityObservationRepository;
  aggregateReleases: CommunityAggregateReleaseRepository;
};

function increment(counts: Record<string, number>, key: string | undefined): void {
  if (!key) return;
  counts[key] = (counts[key] ?? 0) + 1;
}

function soundingStatus(record: StoredCommunitySounding): string {
  return record.quality.rejected ? 'quality_rejected' : 'received';
}

function observationStatus(record: StoredCommunityObservation): string {
  return record.quality.rejected ? 'quality_rejected' : 'received';
}

function hazardStatus(record: StoredCommunityHazard): string {
  return record.publicOverlayEligible ? 'overlay_eligible' : 'private_pending';
}

function releaseStatus(release: CommunityAggregateReleaseManifest): string {
  if (!release.approval) return 'published';
  return release.approval.required ? 'approved' : 'published';
}

function sortRecentItems(
  left: AccountCommunityContributionItem,
  right: AccountCommunityContributionItem
): number {
  return (
    Date.parse(right.createdAt) - Date.parse(left.createdAt) ||
    left.kind.localeCompare(right.kind) ||
    left.id.localeCompare(right.id)
  );
}

export async function buildAccountCommunityContributions(
  accountId: string,
  repositories: AccountCommunityContributionRepositories,
  generatedAt = new Date().toISOString()
): Promise<AccountCommunityContributions> {
  const [allSoundings, allHazards, allObservations, aggregateReleases] = await Promise.all([
    repositories.soundings.listRecords(),
    repositories.hazards.listRecords(),
    repositories.observations.listRecords(),
    repositories.aggregateReleases.listAggregateReleasesByPublisher(accountId),
  ]);
  const soundings = allSoundings.filter((record) => record.ownerAccountId === accountId);
  const hazards = allHazards.filter((record) => record.ownerAccountId === accountId);
  const observations = allObservations.filter((record) => record.ownerAccountId === accountId);
  const byReviewStatus: Record<string, number> = {};

  for (const sounding of soundings) increment(byReviewStatus, sounding.reviewStatus);
  for (const hazard of hazards) increment(byReviewStatus, hazard.reviewStatus);

  const recentItems: AccountCommunityContributionItem[] = [
    ...soundings.map((record) => ({
      id: record.id,
      kind: 'sounding' as const,
      region: record.region,
      status: soundingStatus(record),
      reviewStatus: record.reviewStatus,
      createdAt: record.timestamp,
    })),
    ...hazards.map((record) => ({
      id: record.id,
      kind: 'hazard' as const,
      region: record.region,
      status: hazardStatus(record),
      reviewStatus: record.reviewStatus,
      createdAt: record.reportedAt,
    })),
    ...observations.map((record) => ({
      id: record.id,
      kind: 'observation' as const,
      region: record.region,
      status: observationStatus(record),
      createdAt: record.observedAt,
    })),
    ...aggregateReleases.map((release) => ({
      id: release.id,
      kind: 'aggregate_release' as const,
      region: release.region,
      status: releaseStatus(release),
      createdAt: release.generatedAt,
    })),
  ].sort(sortRecentItems).slice(0, 25);

  return {
    ok: true,
    accountId,
    generatedAt,
    summary: {
      totalRecords: soundings.length + hazards.length + observations.length + aggregateReleases.length,
      soundings: soundings.length,
      hazards: hazards.length,
      observations: observations.length,
      aggregateReleases: aggregateReleases.length,
      byReviewStatus,
    },
    recentItems,
  };
}
