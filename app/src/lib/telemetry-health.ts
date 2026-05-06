import type { TelemetryMessage } from '@/types';

export type TelemetryHealthStatus = 'fresh' | 'stale' | 'missing';
export type TelemetryHealthChannel = 'position' | 'environment' | 'ais' | 'engine';

export type TelemetryHealthItem = {
  channel: TelemetryHealthChannel;
  label: string;
  status: TelemetryHealthStatus;
  latestTimestamp?: string;
  ageSeconds?: number;
};

const CHANNEL_LABELS: Record<TelemetryHealthChannel, string> = {
  position: 'GPS',
  environment: 'Depth/Wx',
  ais: 'AIS',
  engine: 'Engine',
};

const FRESH_SECONDS = 15;
const STALE_SECONDS = 60;

function getLatestMessageTimestamp(messages: TelemetryMessage[], channel: TelemetryHealthChannel): string | undefined {
  return messages
    .filter((message) => message.messageType === channel)
    .map((message) => message.receivedAt ?? message.timestamp)
    .sort()
    .at(-1);
}

function getHealthStatus(ageSeconds: number | undefined): TelemetryHealthStatus {
  if (ageSeconds === undefined) return 'missing';
  if (ageSeconds <= FRESH_SECONDS) return 'fresh';
  if (ageSeconds <= STALE_SECONDS) return 'stale';
  return 'missing';
}

export function formatTelemetryAge(ageSeconds: number | undefined): string {
  if (ageSeconds === undefined) return 'no data';
  if (ageSeconds < 1) return 'now';
  if (ageSeconds < 60) return `${Math.floor(ageSeconds)}s ago`;
  const minutes = Math.floor(ageSeconds / 60);
  return `${minutes}m ago`;
}

export function getTelemetryHealth(
  messages: TelemetryMessage[],
  now = new Date()
): TelemetryHealthItem[] {
  return (Object.keys(CHANNEL_LABELS) as TelemetryHealthChannel[]).map((channel) => {
    const latestTimestamp = getLatestMessageTimestamp(messages, channel);
    const ageSeconds = latestTimestamp
      ? Math.max(0, (now.getTime() - new Date(latestTimestamp).getTime()) / 1000)
      : undefined;

    return {
      channel,
      label: CHANNEL_LABELS[channel],
      status: getHealthStatus(ageSeconds),
      latestTimestamp,
      ageSeconds,
    };
  });
}
