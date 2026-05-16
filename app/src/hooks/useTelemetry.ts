/**
 * HarborMesh - Telemetry Hook
 * Manages real-time telemetry data and WebSocket connections
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useTelemetryStore, useAppStore, useSettingsStore, useCommunityDataStore, useVesselStore } from '@/store';
import { createCommunityObservationsFromTelemetry } from '@/lib/community-observations';
import { createSoundingsFromTelemetry, type SoundingSourceProtocol } from '@/lib/community-soundings';
import { buildSignalKStreamUrl, mapSignalKDeltaToTelemetry, type SignalKDelta } from '@/lib/signalk';
import { mapRecordedSignalKDelta } from '@/lib/signalk-replay';
import type { TelemetryMessage, GeoPosition } from '@/types';

interface UseTelemetryOptions {
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

interface UseTelemetryReturn {
  isConnected: boolean;
  isConnecting: boolean;
  error: Error | null;
  connect: () => void;
  disconnect: () => void;
  sendCommand: (command: unknown) => void;
  latestPosition: GeoPosition | null;
  latestMotion: { roll: number; pitch: number; yaw: number } | null;
  latestEnvironment: {
    depth?: number;
    waterTemp?: number;
    windSpeed?: number;
    windDirection?: number;
    barometricPressure?: number;
  } | null;
  latestEngine: Record<string, { rpm?: number; temp?: number; hours: number }>;
  aisTargets: Array<{
    mmsi: string;
    name?: string;
    position: { latitude: number; longitude: number };
    cog: number;
    sog: number;
    lastUpdate: string;
  }>;
}

// Simulated telemetry for demo purposes
function generateSimulatedTelemetry(vesselId: string, sourceDeviceId: string): TelemetryMessage {
  const types = ['position', 'motion', 'environment', 'engine'] as const;
  const type = types[Math.floor(Math.random() * types.length)];
  
  const baseMessage: Partial<TelemetryMessage> = {
    id: crypto.randomUUID(),
    vesselId,
    sourceDeviceId,
    timestamp: new Date().toISOString(),
  };
  
  switch (type) {
    case 'position':
      return {
        ...baseMessage,
        messageType: 'position',
        payload: {
          latitude: 45.2733 + (Math.random() - 0.5) * 0.01,
          longitude: -66.0633 + (Math.random() - 0.5) * 0.01,
          accuracy: 5 + Math.random() * 10,
          cog: Math.random() * 360,
          sog: 5 + Math.random() * 10,
          fixType: '3d',
          satellites: 8 + Math.floor(Math.random() * 5),
        },
      } as TelemetryMessage;
      
    case 'motion':
      return {
        ...baseMessage,
        messageType: 'motion',
        payload: {
          roll: (Math.random() - 0.5) * 10,
          pitch: (Math.random() - 0.5) * 5,
          yaw: Math.random() * 360,
          heave: (Math.random() - 0.5) * 0.5,
        },
      } as TelemetryMessage;
      
    case 'environment':
      return {
        ...baseMessage,
        messageType: 'environment',
        payload: {
          depth: 10 + Math.random() * 20,
          depthBelowKeel: 8 + Math.random() * 18,
          waterTemperature: 15 + Math.random() * 5,
          windSpeed: 5 + Math.random() * 15,
          windDirection: Math.random() * 360,
          windSpeedApparent: 7 + Math.random() * 12,
          windDirectionApparent: Math.random() * 360,
          barometricPressure: 1013 + (Math.random() - 0.5) * 20,
          airTemperature: 18 + Math.random() * 8,
          humidity: 60 + Math.random() * 20,
        },
      } as TelemetryMessage;
      
    case 'engine':
      return {
        ...baseMessage,
        messageType: 'engine',
        payload: {
          engineId: 'main-engine-001',
          rpm: 1500 + Math.floor(Math.random() * 500),
          temperature: 80 + Math.random() * 10,
          oilPressure: 3 + Math.random() * 0.5,
          oilTemperature: 90 + Math.random() * 5,
          fuelRate: 5 + Math.random() * 3,
          fuelLevel: 75 + Math.random() * 10,
          coolantTemperature: 85 + Math.random() * 5,
          alternatorVoltage: 13.8 + Math.random() * 0.4,
          alternatorCurrent: 20 + Math.random() * 10,
          runtimeHours: 1250.5 + Math.random() * 0.1,
          alarms: [],
        },
      } as TelemetryMessage;
      
    default:
      return baseMessage as TelemetryMessage;
  }
}

export function useTelemetry(options: UseTelemetryOptions = {}): UseTelemetryReturn {
  const {
    autoConnect = true,
    reconnectInterval = 5000,
    maxReconnectAttempts = 5,
  } = options;
  
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const simulationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const connectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manualDisconnectRef = useRef(false);
  const replayIndexRef = useRef(0);
  
  const { addMessage, latestPosition, latestMotion, latestEnvironment, latestEngine, aisTargets } = useTelemetryStore();
  const { setConnectionStatus, addNotification } = useAppStore();
  const boatNode = useSettingsStore((state) => state.boatNode);
  const consent = useSettingsStore((state) => state.consent);
  const demoModeEnabled = useSettingsStore((state) => state.demoModeEnabled);
  const currentVessel = useVesselStore((state) => state.currentVessel);
  const addRawSoundings = useCommunityDataStore((state) => state.addRawSoundings);
  const addObservations = useCommunityDataStore((state) => state.addObservations);

  const stopStreams = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (connectionTimeoutRef.current) {
      clearTimeout(connectionTimeoutRef.current);
      connectionTimeoutRef.current = null;
    }

    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
    }

    if (wsRef.current) {
      const socket = wsRef.current;
      wsRef.current = null;
      socket.close();
    }
  }, []);

  const pushMessages = useCallback((messages: TelemetryMessage[], sourceProtocol: SoundingSourceProtocol) => {
    const receivedAt = new Date().toISOString();
    const receivedMessages = messages.map((message) => ({
      ...message,
      receivedAt,
    }));

    for (const message of receivedMessages) {
      addMessage(message);
    }

    const storeMessages = useTelemetryStore.getState().messages;
    const vesselId = consent?.vesselId ?? currentVessel?.id ?? `local-vessel-${boatNode.deviceId}`;

    const soundings = createSoundingsFromTelemetry([...receivedMessages, ...storeMessages], consent, {
      vesselId,
      sourceProtocol,
      offsets: {
        surfaceToTransducerMeters: boatNode.surfaceToTransducerMeters,
        transducerToKeelMeters: boatNode.transducerToKeelMeters,
      },
    });

    if (soundings.length > 0) {
      addRawSoundings(soundings);
    }

    const observations = createCommunityObservationsFromTelemetry([...receivedMessages, ...storeMessages], consent, {
      vesselId,
      sourceProtocol,
      receivedAt,
    });

    if (observations.length > 0) {
      addObservations(observations);
    }
  }, [
    addMessage,
    addObservations,
    addRawSoundings,
    boatNode.deviceId,
    boatNode.surfaceToTransducerMeters,
    boatNode.transducerToKeelMeters,
    consent,
    currentVessel?.id,
  ]);

  const startReplay = useCallback((notify = true) => {
    stopStreams();
    setError(null);
    setIsConnected(true);
    setIsConnecting(false);
    setConnectionStatus('online');

    simulationIntervalRef.current = setInterval(() => {
      const messages = mapRecordedSignalKDelta(replayIndexRef.current, {
        vesselId: consent?.vesselId ?? currentVessel?.id ?? `local-vessel-${boatNode.deviceId}`,
        sourceDeviceId: 'recorded-signalk',
      });
      replayIndexRef.current += 1;
      pushMessages(messages, 'replay');
    }, 2000);

    if (notify) {
      addNotification({
        type: 'info',
        title: 'Telemetry Replay Active',
        message: 'Using recorded Signal K data for the New Brunswick pilot map.',
      });
    }
  }, [addNotification, boatNode.deviceId, consent?.vesselId, currentVessel?.id, pushMessages, setConnectionStatus, stopStreams]);

  const startSimulation = useCallback(() => {
    stopStreams();
    setError(null);
    setIsConnected(true);
    setIsConnecting(false);
    setConnectionStatus('online');

    simulationIntervalRef.current = setInterval(() => {
      pushMessages([generateSimulatedTelemetry(
        consent?.vesselId ?? currentVessel?.id ?? `local-vessel-${boatNode.deviceId}`,
        boatNode.deviceId || 'generated-simulation',
      )], 'simulated');
    }, 2000);

    addNotification({
      type: 'info',
      title: 'Telemetry Simulation Active',
      message: 'Using generated demo telemetry.',
    });
  }, [addNotification, boatNode.deviceId, consent?.vesselId, currentVessel?.id, pushMessages, setConnectionStatus, stopStreams]);
  
  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    manualDisconnectRef.current = false;
    stopStreams();
    setIsConnecting(true);
    setConnectionStatus('connecting');
    setError(null);

    if (boatNode.telemetryMode === 'replay') {
      startReplay();
      return;
    }

    if (boatNode.telemetryMode === 'simulated') {
      if (!demoModeEnabled) {
        setError(new Error('Demo Mode is required for generated telemetry simulation'));
        setIsConnected(false);
        setIsConnecting(false);
        setConnectionStatus('offline');
        addNotification({
          type: 'warning',
          title: 'Simulation Disabled',
          message: 'Enable Demo Mode in Settings before using generated telemetry.',
        });
        return;
      }
      startSimulation();
      return;
    }

    const fallbackToReplay = () => {
      if (boatNode.fallbackToReplay) {
        startReplay();
        return true;
      }
      return false;
    };

    try {
      const streamUrl = buildSignalKStreamUrl(boatNode.signalKBaseUrl, boatNode.signalKSubscribe);
      const socket = new WebSocket(streamUrl);
      wsRef.current = socket;

      connectionTimeoutRef.current = setTimeout(() => {
        if (wsRef.current === socket && socket.readyState !== WebSocket.OPEN) {
          socket.close();
          if (!fallbackToReplay()) {
            setError(new Error('Signal K connection timed out'));
            setIsConnected(false);
            setIsConnecting(false);
            setConnectionStatus('error');
          }
        }
      }, boatNode.connectionTimeoutSeconds * 1000);

      socket.onopen = () => {
        if (wsRef.current !== socket) return;
        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }

        setIsConnected(true);
        setIsConnecting(false);
        setConnectionStatus('online');
        reconnectAttemptsRef.current = 0;

        addNotification({
          type: 'success',
          title: 'Signal K Connected',
          message: 'Receiving live Boat Node telemetry.',
        });
      };

      socket.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data) as SignalKDelta | SignalKDelta[];
          const deltas = Array.isArray(parsed) ? parsed : [parsed];
          for (const delta of deltas) {
            pushMessages(mapSignalKDeltaToTelemetry(delta, {
              vesselId: consent?.vesselId ?? currentVessel?.id ?? `local-vessel-${boatNode.deviceId}`,
              sourceDeviceId: 'signalk',
            }), 'signalk');
          }
        } catch {
          setError(new Error('Signal K stream sent invalid JSON'));
        }
      };

      socket.onerror = () => {
        if (wsRef.current !== socket) return;
        setError(new Error('Signal K stream error'));
      };

      socket.onclose = () => {
        if (wsRef.current !== socket || manualDisconnectRef.current) return;
        wsRef.current = null;

        if (connectionTimeoutRef.current) {
          clearTimeout(connectionTimeoutRef.current);
          connectionTimeoutRef.current = null;
        }

        setIsConnected(false);
        setIsConnecting(false);

        if (fallbackToReplay()) return;

        setConnectionStatus('error');
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          reconnectTimeoutRef.current = setTimeout(connect, reconnectInterval);
        }
      };
    } catch (err) {
      const nextError = err instanceof Error ? err : new Error('Failed to connect');
      setError(nextError);
      if (!fallbackToReplay()) {
        setIsConnected(false);
        setIsConnecting(false);
        setConnectionStatus('error');
      }
    }
  }, [
    boatNode.connectionTimeoutSeconds,
    boatNode.deviceId,
    boatNode.fallbackToReplay,
    boatNode.signalKBaseUrl,
    boatNode.signalKSubscribe,
    boatNode.telemetryMode,
    consent?.vesselId,
    currentVessel?.id,
    demoModeEnabled,
    addNotification,
    maxReconnectAttempts,
    pushMessages,
    reconnectInterval,
    setConnectionStatus,
    startReplay,
    startSimulation,
    stopStreams,
  ]);
  
  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    manualDisconnectRef.current = true;
    stopStreams();
    
    setIsConnected(false);
    setIsConnecting(false);
    setConnectionStatus('offline');
  }, [setConnectionStatus, stopStreams]);
  
  // Send command to boat node
  const sendCommand = useCallback((command: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'command',
        timestamp: new Date().toISOString(),
        payload: command,
      }));
    } else {
      console.warn('Cannot send command: not connected');
    }
  }, []);
  
  // Auto-connect on mount
  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    
    return () => {
      disconnect();
    };
  }, [autoConnect, connect, disconnect]);
  
  return {
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    sendCommand,
    latestPosition,
    latestMotion,
    latestEnvironment,
    latestEngine,
    aisTargets,
  };
}

// Hook for specific telemetry type
export function useTelemetryByType<T>(type: string): T | null {
  const { getLatestByType } = useTelemetryStore();
  const message = getLatestByType(type);
  return message?.payload as T || null;
}

// Hook for position history
export function usePositionHistory(maxPoints: number = 100): GeoPosition[] {
  const { messages } = useTelemetryStore();
  
  return messages
    .filter((m) => m.messageType === 'position')
    .slice(0, maxPoints)
    .map((m) => ({
      latitude: (m.payload as { latitude: number }).latitude,
      longitude: (m.payload as { longitude: number }).longitude,
      cog: (m.payload as { cog: number }).cog,
      sog: (m.payload as { sog: number }).sog,
      source: 'gps',
      timestamp: m.timestamp,
    }));
}

// Hook for engine data
export function useEngineData(engineId: string) {
  const { latestEngine } = useTelemetryStore();
  return latestEngine[engineId] || null;
}

// Hook for AIS targets
export function useAISTargets() {
  const { aisTargets } = useTelemetryStore();
  return aisTargets;
}
