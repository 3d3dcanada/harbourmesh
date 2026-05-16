/**
 * HarborMesh - Store Tests
 * Zero-Tolerance Quality Assurance - Functional Testing
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import {
  DEFAULT_BOAT_NODE_SETTINGS,
  useAppStore,
  useVesselStore,
  useDocumentStore,
  useLogTaskStore,
  useSettingsStore,
  useCommunityDataStore,
  useNavigationPlanStore,
} from './index';
import { createMockVessel, createMockLogEntry, createMockTask, createMockDocument, createMockItem } from '../test/setup';
import { SharePositionLevel, SpaceType } from '../types';
import type { RawDepthSounding } from '../lib/community-soundings';
import type { CommunityObservationUpload } from '../lib/community-observations';
import { NB_PILOT_REFERENCE_ROUTE } from '../lib/navigation-planning';

function readPersistedState<T>(key: string): T {
  const value = window.localStorage.getItem(key);
  expect(value).toBeTruthy();
  return JSON.parse(value as string).state as T;
}

describe('App Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    useAppStore.setState({
      sidebarOpen: true,
      activeView: 'dashboard',
      theme: 'auto',
      connectionStatus: 'offline',
      notifications: [],
      activeModal: undefined,
      modalData: undefined,
    });
  });

  it('should toggle sidebar', () => {
    const { result } = renderHook(() => useAppStore());

    expect(result.current.sidebarOpen).toBe(true);

    act(() => {
      result.current.toggleSidebar();
    });

    expect(result.current.sidebarOpen).toBe(false);
  });

  it('should set active view', () => {
    const { result } = renderHook(() => useAppStore());

    act(() => {
      result.current.setActiveView('vessel');
    });

    expect(result.current.activeView).toBe('vessel');
  });

  it('should set theme', () => {
    const { result } = renderHook(() => useAppStore());

    act(() => {
      result.current.setTheme('dark');
    });

    expect(result.current.theme).toBe('dark');
  });

  it('should set connection status', () => {
    const { result } = renderHook(() => useAppStore());

    act(() => {
      result.current.setConnectionStatus('online');
    });

    expect(result.current.connectionStatus).toBe('online');
  });

  it('should add notifications', () => {
    const { result } = renderHook(() => useAppStore());

    act(() => {
      result.current.addNotification({
        type: 'info',
        title: 'Test Notification',
        message: 'This is a test',
      });
    });

    expect(result.current.notifications.length).toBe(1);
    expect(result.current.notifications[0].title).toBe('Test Notification');
    expect(result.current.notifications[0].read).toBe(false);
  });

  it('should limit notifications to 50', () => {
    const { result } = renderHook(() => useAppStore());

    act(() => {
      for (let i = 0; i < 60; i++) {
        result.current.addNotification({
          type: 'info',
          title: `Notification ${i}`,
          message: 'Test',
        });
      }
    });

    expect(result.current.notifications.length).toBe(50);
  });

  it('should mark notification as read', () => {
    const { result } = renderHook(() => useAppStore());

    act(() => {
      result.current.addNotification({
        type: 'info',
        title: 'Test',
        message: 'Test',
      });
    });

    const notificationId = result.current.notifications[0].id;

    act(() => {
      result.current.markNotificationRead(notificationId);
    });

    expect(result.current.notifications[0].read).toBe(true);
  });

  it('should open and close modal', () => {
    const { result } = renderHook(() => useAppStore());

    act(() => {
      result.current.openModal('vesselForm', { mode: 'create' });
    });

    expect(result.current.activeModal).toBe('vesselForm');
    expect(result.current.modalData).toEqual({ mode: 'create' });

    act(() => {
      result.current.closeModal();
    });

    expect(result.current.activeModal).toBeUndefined();
    expect(result.current.modalData).toBeUndefined();
  });
});

describe('Vessel Store', () => {
  beforeEach(() => {
    useVesselStore.setState({
      vessels: [],
      currentVessel: null,
      spaces: [],
      items: [],
      systems: [],
    });
  });

  it('should add vessel', () => {
    const { result } = renderHook(() => useVesselStore());
    const mockVessel = createMockVessel();

    act(() => {
      result.current.addVessel(mockVessel);
    });

    expect(result.current.vessels.length).toBe(1);
    expect(result.current.vessels[0].name).toBe('Test Vessel');
  });

  it('persists user-owned vessel data locally', () => {
    const { result } = renderHook(() => useVesselStore());
    const mockVessel = createMockVessel();
    const mockItem = createMockItem();

    act(() => {
      result.current.addVessel(mockVessel);
      result.current.addItem(mockItem);
      result.current.setCurrentVessel(mockVessel);
    });

    const persisted = readPersistedState<{
      vessels: unknown[];
      items: unknown[];
      currentVessel: { id: string };
    }>('harbormesh-vessel-data');

    expect(persisted.vessels).toHaveLength(1);
    expect(persisted.items).toHaveLength(1);
    expect(persisted.currentVessel.id).toBe(mockVessel.id);
  });

  it('should update vessel', () => {
    const { result } = renderHook(() => useVesselStore());
    const mockVessel = createMockVessel();

    act(() => {
      result.current.addVessel(mockVessel);
      result.current.updateVessel(mockVessel.id, { name: 'Updated Vessel' });
    });

    expect(result.current.vessels[0].name).toBe('Updated Vessel');
  });

  it('should delete vessel', () => {
    const { result } = renderHook(() => useVesselStore());
    const mockVessel = createMockVessel();

    act(() => {
      result.current.addVessel(mockVessel);
      result.current.deleteVessel(mockVessel.id);
    });

    expect(result.current.vessels.length).toBe(0);
  });

  it('should set current vessel', () => {
    const { result } = renderHook(() => useVesselStore());
    const mockVessel = createMockVessel();

    act(() => {
      result.current.addVessel(mockVessel);
      result.current.setCurrentVessel(mockVessel);
    });

    expect(result.current.currentVessel?.id).toBe(mockVessel.id);
  });

  it('should add space', () => {
    const { result } = renderHook(() => useVesselStore());

    act(() => {
      result.current.setSpaces([
        {
          id: 'space-1',
          vesselId: 'vessel-1',
          name: 'Cockpit',
          type: SpaceType.COCKPIT,
          createdAt: '2026-05-06T12:00:00.000Z',
          updatedAt: '2026-05-06T12:00:00.000Z',
        },
      ]);
    });

    expect(result.current.spaces.length).toBe(1);
  });

  it('should add item', () => {
    const { result } = renderHook(() => useVesselStore());
    const mockItem = createMockItem();

    act(() => {
      result.current.addItem(mockItem);
    });

    expect(result.current.items.length).toBe(1);
    expect(result.current.items[0].name).toBe('Test Item');
  });

  it('should update item', () => {
    const { result } = renderHook(() => useVesselStore());
    const mockItem = createMockItem();

    act(() => {
      result.current.addItem(mockItem);
      result.current.updateItem(mockItem.id, { quantity: 5 });
    });

    expect(result.current.items[0].quantity).toBe(5);
  });
});

describe('Document Store', () => {
  beforeEach(() => {
    useDocumentStore.setState({
      documents: [],
      selectedDocument: null,
      isLoading: false,
    });
  });

  it('should add document', () => {
    const { result } = renderHook(() => useDocumentStore());
    const mockDocument = createMockDocument();

    act(() => {
      result.current.addDocument(mockDocument);
    });

    expect(result.current.documents.length).toBe(1);
  });

  it('persists user-owned documents locally', () => {
    const { result } = renderHook(() => useDocumentStore());
    const mockDocument = createMockDocument();

    act(() => {
      result.current.addDocument(mockDocument);
    });

    const persisted = readPersistedState<{ documents: unknown[] }>('harbormesh-documents');

    expect(persisted.documents).toHaveLength(1);
  });

  it('should get documents by type', () => {
    const { result } = renderHook(() => useDocumentStore());
    const mockDoc1 = createMockDocument({ type: 'manual' });
    const mockDoc2 = createMockDocument({ type: 'survey' });
    const mockDoc3 = createMockDocument({ type: 'manual' });

    act(() => {
      result.current.setDocuments([mockDoc1, mockDoc2, mockDoc3]);
    });

    const manuals = result.current.getDocumentsByType('manual');
    expect(manuals.length).toBe(2);
  });

  it('should get documents by vessel', () => {
    const { result } = renderHook(() => useDocumentStore());
    const mockDoc1 = createMockDocument({ vesselId: 'vessel-1' });
    const mockDoc2 = createMockDocument({ vesselId: 'vessel-2' });

    act(() => {
      result.current.setDocuments([mockDoc1, mockDoc2]);
    });

    const vessel1Docs = result.current.getDocumentsByVessel('vessel-1');
    expect(vessel1Docs.length).toBe(1);
  });

  it('should get expiring documents', () => {
    const { result } = renderHook(() => useDocumentStore());

    const now = new Date();
    const expiringDoc = createMockDocument({
      metadata: {
        expiryDate: new Date(now.getTime() + 7 * 86400000).toISOString(),
        tags: [],
      },
    });
    const validDoc = createMockDocument({
      id: 'doc-2',
      metadata: {
        expiryDate: new Date(now.getTime() + 365 * 86400000).toISOString(),
        tags: [],
      },
    });

    act(() => {
      result.current.setDocuments([expiringDoc, validDoc]);
    });

    const expiringIn30Days = result.current.getExpiringDocuments(30);
    expect(expiringIn30Days.length).toBe(1);
  });

  it('should select document', () => {
    const { result } = renderHook(() => useDocumentStore());
    const mockDocument = createMockDocument();

    act(() => {
      result.current.selectDocument(mockDocument);
    });

    expect(result.current.selectedDocument?.id).toBe(mockDocument.id);
  });
});

describe('Log & Task Store', () => {
  beforeEach(() => {
    useLogTaskStore.setState({
      logs: [],
      tasks: [],
      selectedLog: null,
      selectedTask: null,
    });
  });

  it('should add log entry', () => {
    const { result } = renderHook(() => useLogTaskStore());
    const mockLog = createMockLogEntry();

    act(() => {
      result.current.addLog(mockLog);
    });

    expect(result.current.logs.length).toBe(1);
    expect(result.current.logs[0].title).toBe('Test Voyage');
  });

  it('should add task', () => {
    const { result } = renderHook(() => useLogTaskStore());
    const mockTask = createMockTask();

    act(() => {
      result.current.addTask(mockTask);
    });

    expect(result.current.tasks.length).toBe(1);
    expect(result.current.tasks[0].status).toBe('open');
  });

  it('persists user-owned logs and tasks locally', () => {
    const { result } = renderHook(() => useLogTaskStore());
    const mockLog = createMockLogEntry();
    const mockTask = createMockTask();

    act(() => {
      result.current.addLog(mockLog);
      result.current.addTask(mockTask);
    });

    const persisted = readPersistedState<{
      logs: unknown[];
      tasks: unknown[];
    }>('harbormesh-logbook');

    expect(persisted.logs).toHaveLength(1);
    expect(persisted.tasks).toHaveLength(1);
  });

  it('should complete task', () => {
    const { result } = renderHook(() => useLogTaskStore());
    const mockTask = createMockTask();

    act(() => {
      result.current.addTask(mockTask);
      result.current.completeTask(mockTask.id, 'test-user-001', 'Completed successfully');
    });

    expect(result.current.tasks[0].status).toBe('complete');
  });

  it('should approve task', () => {
    const { result } = renderHook(() => useLogTaskStore());
    const mockTask = createMockTask({ status: 'needs_approval' as const });

    act(() => {
      result.current.addTask(mockTask);
      result.current.approveTask(mockTask.id, {
        approverId: 'captain-001',
        approverName: 'Captain Smith',
        status: 'approved',
        note: 'Looks good',
      });
    });

    expect(result.current.tasks[0].status).toBe('complete');
  });

  it('should get open tasks', () => {
    const { result } = renderHook(() => useLogTaskStore());

    const openTask = createMockTask({ status: 'open' as const });
    const progressTask = createMockTask({ id: 'task-2', status: 'in_progress' as const });
    const completeTask = createMockTask({ id: 'task-3', status: 'complete' as const });

    act(() => {
      result.current.setTasks([openTask, progressTask, completeTask]);
    });

    const openTasks = result.current.getOpenTasks();
    expect(openTasks.length).toBe(2);
  });

  it('should get overdue tasks', () => {
    const { result } = renderHook(() => useLogTaskStore());

    const overdueTask = createMockTask({
      status: 'open' as const,
      dueDate: new Date(Date.now() - 86400000).toISOString(),
    });
    const futureTask = createMockTask({
      id: 'task-2',
      status: 'open' as const,
      dueDate: new Date(Date.now() + 86400000).toISOString(),
    });

    act(() => {
      result.current.setTasks([overdueTask, futureTask]);
    });

    const overdueTasks = result.current.getOverdueTasks();
    expect(overdueTasks.length).toBe(1);
  });
});

describe('Settings Store', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      consent: null,
      demoModeEnabled: false,
      boatNode: DEFAULT_BOAT_NODE_SETTINGS,
    });
  });

  it('defaults telemetry to recorded replay for hardware-free NB testing', () => {
    const { result } = renderHook(() => useSettingsStore());

    expect(result.current.boatNode.deviceId).toBe('boat-node-001');
    expect(result.current.boatNode.telemetryMode).toBe('replay');
    expect(result.current.boatNode.fallbackToReplay).toBe(true);
    expect(result.current.boatNode.capabilities.depth).toBe(true);
  });

  it('updates Boat Node settings without replacing the full settings object', () => {
    const { result } = renderHook(() => useSettingsStore());

    act(() => {
      result.current.updateBoatNodeSettings({
        telemetryMode: 'signalk',
        signalKBaseUrl: 'http://boat-node.local:3000',
        connectionTimeoutSeconds: 15,
        deviceRegisteredAt: '2026-05-06T12:00:00.000Z',
      });
    });

    expect(result.current.boatNode).toMatchObject({
      deviceId: 'boat-node-001',
      telemetryMode: 'signalk',
      signalKBaseUrl: 'http://boat-node.local:3000',
      connectionTimeoutSeconds: 15,
      fallbackToReplay: true,
      deviceRegisteredAt: '2026-05-06T12:00:00.000Z',
    });
  });

  it('keeps demo mode disabled until explicitly enabled', () => {
    const { result } = renderHook(() => useSettingsStore());

    expect(result.current.demoModeEnabled).toBe(false);

    act(() => {
      result.current.setDemoModeEnabled(true);
    });

    expect(result.current.demoModeEnabled).toBe(true);
  });
});

describe('Navigation Plan Store', () => {
  beforeEach(() => {
    useNavigationPlanStore.setState({
      routes: [],
      activeRouteId: null,
    });
  });

  it('starts without seeded reference routes in launch mode', () => {
    const { result } = renderHook(() => useNavigationPlanStore());

    expect(result.current.routes).toEqual([]);
    expect(result.current.activeRouteId).toBeNull();
  });

  it('seeds the NB pilot reference route without duplicating it', () => {
    const { result } = renderHook(() => useNavigationPlanStore());

    act(() => {
      result.current.seedNBPilotReferenceRoute();
      result.current.seedNBPilotReferenceRoute();
    });

    expect(result.current.routes).toHaveLength(1);
    expect(result.current.routes[0].id).toBe(NB_PILOT_REFERENCE_ROUTE.id);
    expect(result.current.activeRouteId).toBe(NB_PILOT_REFERENCE_ROUTE.id);
  });

  it('sets and returns the active route', () => {
    const { result } = renderHook(() => useNavigationPlanStore());

    act(() => {
      result.current.addRoute(NB_PILOT_REFERENCE_ROUTE);
      result.current.setActiveRoute(NB_PILOT_REFERENCE_ROUTE.id);
    });

    expect(result.current.getActiveRoute()?.id).toBe(NB_PILOT_REFERENCE_ROUTE.id);
  });
});

describe('Community Data Store', () => {
  const createObservation = (overrides: Partial<CommunityObservationUpload> = {}): CommunityObservationUpload => ({
    id: 'observation-1',
    vesselId: 'vessel-1',
    sourceDeviceId: 'boat-node-001',
    sourceProtocol: 'signalk',
    observationType: 'weather',
    observedAt: '2026-05-06T12:07:00.000Z',
    receivedAt: '2026-05-06T12:07:01.000Z',
    sharingState: 'shareable_no_position',
    consentCapturedAt: '2026-05-06T11:59:00.000Z',
    metrics: {
      windSpeedKnots: 13.4,
    },
    quality: {
      confidence: 0.84,
      rejected: false,
      flags: [],
    },
    rawPayloadIncluded: false,
    officialChartDataIncluded: false,
    ...overrides,
  });

  const createRawSounding = (overrides: Partial<RawDepthSounding> = {}): RawDepthSounding => ({
    id: 'sounding-1',
    vesselId: 'vessel-1',
    sourceDeviceId: 'signalk',
    sourceProtocol: 'signalk',
    rawMessageId: 'env-1',
    timestamp: '2026-05-06T12:00:00.000Z',
    receivedAt: '2026-05-06T12:00:01.000Z',
    position: { latitude: 45.27, longitude: -66.06 },
    rawDepthMeters: 12,
    depthMeters: 12.5,
    depthReference: 'below_transducer',
    tideCorrectionApplied: false,
    waterLevelCorrectionApplied: false,
    offsets: { surfaceToTransducerMeters: 0.5 },
    consent: {
      shareTelemetryForCommunity: true,
      shareLivePosition: SharePositionLevel.BLURRED,
      telemetryAnonymization: 'full',
      capturedAt: '2026-05-06T12:00:00.000Z',
    },
    sharing: {
      state: 'shareable_blurred',
      uploadLatitude: 45.27,
      uploadLongitude: -66.06,
    },
    quality: {
      confidence: 0.9,
      rejected: false,
      flags: [],
    },
    ...overrides,
  });

  beforeEach(() => {
    useCommunityDataStore.setState({
      rawSoundings: [],
      observations: [],
      uploadBatches: [],
      observationBatches: [],
      hazardBatches: [],
      hazards: [],
    });
  });

  it('deduplicates raw soundings by id', () => {
    const { result } = renderHook(() => useCommunityDataStore());
    const sounding = {
      id: 'sounding-1',
      vesselId: 'vessel-1',
      sourceDeviceId: 'signalk',
      sourceProtocol: 'signalk',
      rawMessageId: 'env-1',
      timestamp: '2026-05-06T12:00:00.000Z',
      receivedAt: '2026-05-06T12:00:01.000Z',
      position: { latitude: 45.27, longitude: -66.06 },
      rawDepthMeters: 12,
      depthMeters: 12.5,
      depthReference: 'below_transducer',
      tideCorrectionApplied: false,
      waterLevelCorrectionApplied: false,
      offsets: { surfaceToTransducerMeters: 0.5 },
      consent: {
        shareTelemetryForCommunity: true,
        shareLivePosition: 'blurred',
        telemetryAnonymization: 'full',
        capturedAt: '2026-05-06T12:00:00.000Z',
      },
      sharing: {
        state: 'shareable_blurred',
        uploadLatitude: 45.27,
        uploadLongitude: -66.06,
      },
      quality: {
        confidence: 0.9,
        rejected: false,
        flags: [],
      },
    };

    act(() => {
      result.current.addRawSoundings([sounding as never, { ...sounding, depthMeters: 12.7 } as never]);
    });

    expect(result.current.rawSoundings).toHaveLength(1);
    expect(result.current.rawSoundings[0].depthMeters).toBe(12.7);
  });

  it('returns only shareable sounding upload records', () => {
    const { result } = renderHook(() => useCommunityDataStore());

    act(() => {
      result.current.addRawSoundings([
        {
          id: 'sounding-1',
          vesselId: 'vessel-1',
          sourceDeviceId: 'signalk',
          sourceProtocol: 'signalk',
          rawMessageId: 'env-1',
          timestamp: '2026-05-06T12:00:00.000Z',
          receivedAt: '2026-05-06T12:00:01.000Z',
          position: { latitude: 45.27, longitude: -66.06 },
          rawDepthMeters: 12,
          depthMeters: 12.5,
          depthReference: 'below_transducer',
          tideCorrectionApplied: false,
          waterLevelCorrectionApplied: false,
          offsets: { surfaceToTransducerMeters: 0.5 },
          consent: {
            shareTelemetryForCommunity: true,
            shareLivePosition: 'blurred',
            telemetryAnonymization: 'full',
            capturedAt: '2026-05-06T12:00:00.000Z',
          },
          sharing: {
            state: 'shareable_blurred',
            uploadLatitude: 45.27,
            uploadLongitude: -66.06,
          },
          quality: {
            confidence: 0.9,
            rejected: false,
            flags: [],
          },
        } as never,
        {
          id: 'sounding-2',
          vesselId: 'vessel-1',
          sourceDeviceId: 'signalk',
          sourceProtocol: 'signalk',
          rawMessageId: 'env-2',
          timestamp: '2026-05-06T12:01:00.000Z',
          receivedAt: '2026-05-06T12:01:01.000Z',
          position: { latitude: 45.28, longitude: -66.07 },
          rawDepthMeters: 0,
          depthMeters: 0,
          depthReference: 'below_transducer',
          tideCorrectionApplied: false,
          waterLevelCorrectionApplied: false,
          offsets: {},
          consent: {
            shareTelemetryForCommunity: true,
            shareLivePosition: 'blurred',
            telemetryAnonymization: 'full',
            capturedAt: '2026-05-06T12:00:00.000Z',
          },
          sharing: {
            state: 'shareable_blurred',
            uploadLatitude: 45.28,
            uploadLongitude: -66.07,
          },
          quality: {
            confidence: 0.1,
            rejected: true,
            flags: ['depth_out_of_range'],
          },
        } as never,
      ]);
    });

    expect(result.current.getShareableSoundings()).toHaveLength(1);
  });

  it('queues shareable soundings once for offline-first sync', () => {
    const { result } = renderHook(() => useCommunityDataStore());
    let firstBatch = null;
    let secondBatch = null;

    act(() => {
      result.current.addRawSoundings([
        createRawSounding(),
        createRawSounding({
          id: 'sounding-2',
          rawMessageId: 'env-2',
          timestamp: '2026-05-06T12:01:00.000Z',
        }),
      ]);
      firstBatch = result.current.queueShareableSoundingBatch({
        now: '2026-05-06T12:02:00.000Z',
        endpoint: '/api/community/soundings',
      });
      secondBatch = result.current.queueShareableSoundingBatch({
        now: '2026-05-06T12:03:00.000Z',
        endpoint: '/api/community/soundings',
      });
    });

    expect(firstBatch).toMatchObject({
      status: 'queued',
      endpoint: '/api/community/soundings',
      payload: {
        recordCount: 2,
        policy: {
          officialChartDataIncluded: false,
          rawLocalPositionsIncluded: false,
        },
      },
    });
    expect(secondBatch).toBeNull();
    expect(result.current.getQueuedUploadBatches()).toHaveLength(1);
  });

  it('queues governed community observations once for offline-first sync', () => {
    const { result } = renderHook(() => useCommunityDataStore());
    let firstBatch = null;
    let secondBatch = null;

    act(() => {
      result.current.addObservations([
        createObservation(),
        createObservation({
          id: 'observation-2',
          observationType: 'condition',
          observedAt: '2026-05-06T12:08:00.000Z',
          metrics: {
            waterTemperatureC: 11.5,
          },
        }),
      ]);
      firstBatch = result.current.queueShareableObservationBatch({
        now: '2026-05-06T12:09:00.000Z',
        endpoint: '/api/community/observations',
      });
      secondBatch = result.current.queueShareableObservationBatch({
        now: '2026-05-06T12:10:00.000Z',
        endpoint: '/api/community/observations',
      });
    });

    expect(firstBatch).toMatchObject({
      status: 'queued',
      endpoint: '/api/community/observations',
      payload: {
        schemaVersion: 'harbourmesh.community-observations.v1',
        recordCount: 2,
        policy: {
          officialChartDataIncluded: false,
          rawLocalPositionsIncluded: false,
          rawSensorPayloadsIncluded: false,
        },
      },
    });
    expect(secondBatch).toBeNull();
    expect(result.current.getQueuedObservationBatches()).toHaveLength(1);
  });

  it('tracks community observation upload batch status', () => {
    const { result } = renderHook(() => useCommunityDataStore());
    let batchId = '';

    act(() => {
      result.current.addObservations([createObservation()]);
      const batch = result.current.queueShareableObservationBatch({
        now: '2026-05-06T12:09:00.000Z',
      });
      batchId = batch?.id ?? '';
      result.current.markObservationBatchStatus(batchId, 'acknowledged', {
        acknowledgedId: 'observation-receipt-1',
        updatedAt: '2026-05-06T12:10:00.000Z',
      });
    });

    expect(result.current.observationBatches[0]).toMatchObject({
      id: batchId,
      status: 'acknowledged',
      acknowledgedId: 'observation-receipt-1',
      updatedAt: '2026-05-06T12:10:00.000Z',
    });
  });

  it('tracks community sounding upload batch status', () => {
    const { result } = renderHook(() => useCommunityDataStore());
    let batchId = '';

    act(() => {
      result.current.addRawSoundings([createRawSounding()]);
      const batch = result.current.queueShareableSoundingBatch({
        now: '2026-05-06T12:02:00.000Z',
      });
      batchId = batch?.id ?? '';
      result.current.markUploadBatchStatus(batchId, 'sent', {
        updatedAt: '2026-05-06T12:03:00.000Z',
      });
    });

    expect(result.current.uploadBatches[0]).toMatchObject({
      id: batchId,
      status: 'sent',
      updatedAt: '2026-05-06T12:03:00.000Z',
      attemptCount: 1,
    });
  });

  it('stores local hazard reports with timestamp and position', () => {
    const { result } = renderHook(() => useCommunityDataStore());
    let hazardId = '';

    act(() => {
      const hazard = result.current.reportHazard({
        vesselId: 'vessel-1',
        sourceDeviceId: 'boat-node-001',
        type: 'debris',
        severity: 'medium',
        description: 'Floating debris near track',
        reportedAt: '2026-05-06T12:04:00.000Z',
        position: {
          latitude: 45.27,
          longitude: -66.06,
          source: 'gps',
          timestamp: '2026-05-06T12:04:00.000Z',
        },
      });
      hazardId = hazard.id;
    });

    expect(result.current.hazards[0]).toMatchObject({
      id: hazardId,
      type: 'debris',
      severity: 'medium',
      status: 'local',
      position: {
        latitude: 45.27,
        longitude: -66.06,
      },
    });
  });

  it('queues hazard reports with blurred positions for community sync', () => {
    const { result } = renderHook(() => useCommunityDataStore());
    let batch = null;

    act(() => {
      result.current.reportHazard({
        vesselId: 'vessel-1',
        sourceDeviceId: 'boat-node-001',
        type: 'shoal',
        severity: 'high',
        description: 'Unexpected shoal near route',
        reportedAt: '2026-05-06T12:04:00.000Z',
        position: {
          latitude: 45.2749,
          longitude: -66.0649,
          accuracy: 8,
          source: 'gps',
          timestamp: '2026-05-06T12:04:00.000Z',
        },
      });
      batch = result.current.queueShareableHazardBatch({
        now: '2026-05-06T12:05:00.000Z',
        endpoint: '/api/community/hazards',
        sharePosition: SharePositionLevel.BLURRED,
        consentCapturedAt: '2026-05-06T11:59:00.000Z',
      });
    });

    expect(batch).toMatchObject({
      status: 'queued',
      endpoint: '/api/community/hazards',
      payload: {
        schemaVersion: 'harbourmesh.community-hazards.v1',
        recordCount: 1,
        hazards: [
          {
            type: 'shoal',
            sharingState: 'shareable_blurred',
            consentCapturedAt: '2026-05-06T11:59:00.000Z',
            position: {
              latitude: 45.27,
              longitude: -66.06,
              accuracy: 1000,
            },
          },
        ],
        policy: {
          officialChartDataIncluded: false,
          rawLocalPositionsIncluded: false,
          containsFullSharedPositions: false,
        },
      },
    });
    expect(result.current.hazards[0].status).toBe('queued');
    expect(result.current.getQueuedHazardBatches()).toHaveLength(1);
  });

  it('acknowledges synced hazard reports', () => {
    const { result } = renderHook(() => useCommunityDataStore());
    let batchId = '';

    act(() => {
      result.current.reportHazard({
        vesselId: 'vessel-1',
        type: 'weather',
        severity: 'low',
        description: 'Fog bank forming',
        reportedAt: '2026-05-06T12:04:00.000Z',
      });
      const batch = result.current.queueShareableHazardBatch({
        now: '2026-05-06T12:05:00.000Z',
        sharePosition: SharePositionLevel.NONE,
      });
      batchId = batch?.id ?? '';
      result.current.markHazardBatchStatus(batchId, 'acknowledged', {
        acknowledgedId: 'receipt-1',
        updatedAt: '2026-05-06T12:06:00.000Z',
      });
    });

    expect(result.current.hazardBatches[0]).toMatchObject({
      id: batchId,
      status: 'acknowledged',
      acknowledgedId: 'receipt-1',
      updatedAt: '2026-05-06T12:06:00.000Z',
    });
    expect(result.current.hazards[0].status).toBe('acknowledged');
  });
});
