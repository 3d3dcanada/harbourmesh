/**
 * HarborMesh - Telemetry Hook
 * Manages real-time telemetry data and WebSocket connections
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useTelemetryStore, useAppStore } from '@/store';
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
function generateSimulatedTelemetry(): TelemetryMessage {
  const types = ['position', 'motion', 'environment', 'engine'] as const;
  const type = types[Math.floor(Math.random() * types.length)];
  
  const baseMessage: Partial<TelemetryMessage> = {
    id: crypto.randomUUID(),
    vesselId: 'demo-vessel',
    sourceDeviceId: 'boat-node-001',
    timestamp: new Date().toISOString(),
  };
  
  switch (type) {
    case 'position':
      return {
        ...baseMessage,
        messageType: 'position',
        payload: {
          latitude: 37.7749 + (Math.random() - 0.5) * 0.01,
          longitude: -122.4194 + (Math.random() - 0.5) * 0.01,
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
  
  const { addMessage, latestPosition, latestMotion, latestEnvironment, latestEngine, aisTargets } = useTelemetryStore();
  const { setConnectionStatus, addNotification } = useAppStore();
  
  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    setIsConnecting(true);
    setError(null);
    
    try {
      // In production, this would connect to the actual Boat Node WebSocket
      // For demo, we'll use simulated data
      
      // Simulate connection
      setTimeout(() => {
        setIsConnected(true);
        setIsConnecting(false);
        setConnectionStatus('online');
        reconnectAttemptsRef.current = 0;
        
        // Start simulation
        simulationIntervalRef.current = setInterval(() => {
          const message = generateSimulatedTelemetry();
          addMessage(message);
        }, 2000);
        
        addNotification({
          type: 'success',
          title: 'Telemetry Connected',
          message: 'Connected to vessel data stream',
        });
      }, 1000);
      
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to connect'));
      setIsConnecting(false);
      setConnectionStatus('error');
      
      // Attempt reconnection
      if (reconnectAttemptsRef.current < maxReconnectAttempts) {
        reconnectAttemptsRef.current++;
        reconnectTimeoutRef.current = setTimeout(connect, reconnectInterval);
      }
    }
  }, [addMessage, setConnectionStatus, addNotification, reconnectInterval, maxReconnectAttempts]);
  
  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
    setConnectionStatus('offline');
  }, [setConnectionStatus]);
  
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
