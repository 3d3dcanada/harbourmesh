export type HeadingSource = 'compass' | 'cog' | 'none';

export interface ResolvedHeading {
  heading: number;
  source: HeadingSource;
}

export function resolveHeading(
  compassHeading: number | undefined,
  cog: number | undefined,
  sog: number | undefined,
  sogThreshold = 0.5,
): ResolvedHeading {
  const isMoving = sog != null && sog > sogThreshold;

  if (isMoving && cog != null && !isNaN(cog)) {
    return { heading: cog, source: 'cog' };
  }
  if (compassHeading != null && !isNaN(compassHeading)) {
    return { heading: compassHeading, source: 'compass' };
  }
  if (cog != null && !isNaN(cog)) {
    return { heading: cog, source: 'cog' };
  }
  return { heading: 0, source: 'none' };
}
