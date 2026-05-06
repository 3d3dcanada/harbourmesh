/**
 * HarborMesh - Zustand Store
 * Global state management for the application
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  SharePositionLevel,
  ThemeMode,
  type AppState,
  type User,
  type Vessel,
  type Tenant,
  type ViewType,
  type AppNotification,
  type ConsentSettings,
  type AIProviderConfig,
  type TelemetryMessage,
  type LogEntry,
  type Task,
  type Document,
  type Item,
  type Space,
  type SystemComponent,
  type GeoPosition,
  type Route,
} from '@/types';
import { NB_PILOT_REFERENCE_ROUTE } from '@/lib/navigation-planning';
import {
  buildCommunitySoundingUploadBatch,
  prepareSoundingForCommunityUpload,
  type CommunitySoundingUpload,
  type CommunitySoundingUploadBatch,
  type RawDepthSounding,
} from '@/lib/community-soundings';

// ============================================================================
// APP STORE
// ============================================================================

interface AppStore extends AppState {
  // Actions
  setCurrentVessel: (vesselId: string) => void;
  setCurrentUser: (user: User | undefined) => void;
  setCurrentTenant: (tenant: Tenant | undefined) => void;
  setActiveView: (view: ViewType) => void;
  toggleSidebar: () => void;
  setTheme: (theme: ThemeMode) => void;
  setConnectionStatus: (status: AppState['connectionStatus']) => void;
  addNotification: (notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'>) => void;
  markNotificationRead: (id: string) => void;
  clearNotifications: () => void;
  openModal: (modal: string, data?: unknown) => void;
  closeModal: () => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, _get) => ({
      // Initial state
      sidebarOpen: true,
      activeView: 'dashboard',
      theme: ThemeMode.AUTO,
      connectionStatus: 'offline',
      notifications: [],
      
      // Actions
      setCurrentVessel: (vesselId) => set({ currentVesselId: vesselId }),
      setCurrentUser: (user) => set({ currentUser: user }),
      setCurrentTenant: (tenant) => set({ currentTenant: tenant }),
      setActiveView: (view) => set({ activeView: view }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setTheme: (theme) => set({ theme }),
      setConnectionStatus: (status) => set({ connectionStatus: status }),
      addNotification: (notification) => {
        const newNotification: AppNotification = {
          ...notification,
          id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
          read: false,
        };
        set((state) => ({
          notifications: [newNotification, ...state.notifications].slice(0, 50),
        }));
      },
      markNotificationRead: (id) =>
        set((state) => ({
          notifications: state.notifications.map((n) =>
            n.id === id ? { ...n, read: true } : n
          ),
        })),
      clearNotifications: () => set({ notifications: [] }),
      openModal: (modal, data) => set({ activeModal: modal, modalData: data }),
      closeModal: () => set({ activeModal: undefined, modalData: undefined }),
    }),
    {
      name: 'harbormesh-app',
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        theme: state.theme,
        currentVesselId: state.currentVesselId,
      }),
    }
  )
);

// ============================================================================
// VESSEL STORE
// ============================================================================

interface VesselStore {
  vessels: Vessel[];
  currentVessel: Vessel | null;
  spaces: Space[];
  items: Item[];
  systems: SystemComponent[];
  
  // Actions
  setVessels: (vessels: Vessel[]) => void;
  addVessel: (vessel: Vessel) => void;
  updateVessel: (id: string, updates: Partial<Vessel>) => void;
  deleteVessel: (id: string) => void;
  setCurrentVessel: (vessel: Vessel | null) => void;
  
  setSpaces: (spaces: Space[]) => void;
  addSpace: (space: Space) => void;
  updateSpace: (id: string, updates: Partial<Space>) => void;
  deleteSpace: (id: string) => void;
  
  setItems: (items: Item[]) => void;
  addItem: (item: Item) => void;
  updateItem: (id: string, updates: Partial<Item>) => void;
  deleteItem: (id: string) => void;
  
  setSystems: (systems: SystemComponent[]) => void;
  addSystem: (system: SystemComponent) => void;
  updateSystem: (id: string, updates: Partial<SystemComponent>) => void;
}

export const useVesselStore = create<VesselStore>()((set) => ({
  vessels: [],
  currentVessel: null,
  spaces: [],
  items: [],
  systems: [],
  
  setVessels: (vessels) => set({ vessels }),
  addVessel: (vessel) => set((state) => ({ vessels: [...state.vessels, vessel] })),
  updateVessel: (id, updates) =>
    set((state) => ({
      vessels: state.vessels.map((v) => (v.id === id ? { ...v, ...updates } : v)),
      currentVessel: state.currentVessel?.id === id 
        ? { ...state.currentVessel, ...updates } 
        : state.currentVessel,
    })),
  deleteVessel: (id) =>
    set((state) => ({
      vessels: state.vessels.filter((v) => v.id !== id),
      currentVessel: state.currentVessel?.id === id ? null : state.currentVessel,
    })),
  setCurrentVessel: (vessel) => set({ currentVessel: vessel }),
  
  setSpaces: (spaces) => set({ spaces }),
  addSpace: (space) => set((state) => ({ spaces: [...state.spaces, space] })),
  updateSpace: (id, updates) =>
    set((state) => ({
      spaces: state.spaces.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    })),
  deleteSpace: (id) =>
    set((state) => ({ spaces: state.spaces.filter((s) => s.id !== id) })),
  
  setItems: (items) => set({ items }),
  addItem: (item) => set((state) => ({ items: [...state.items, item] })),
  updateItem: (id, updates) =>
    set((state) => ({
      items: state.items.map((i) => (i.id === id ? { ...i, ...updates } : i)),
    })),
  deleteItem: (id) =>
    set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
  
  setSystems: (systems) => set({ systems }),
  addSystem: (system) => set((state) => ({ systems: [...state.systems, system] })),
  updateSystem: (id, updates) =>
    set((state) => ({
      systems: state.systems.map((s) => (s.id === id ? { ...s, ...updates } : s)),
    })),
}));

// ============================================================================
// DOCUMENT STORE
// ============================================================================

interface DocumentStore {
  documents: Document[];
  selectedDocument: Document | null;
  isLoading: boolean;
  
  // Actions
  setDocuments: (documents: Document[]) => void;
  addDocument: (document: Document) => void;
  updateDocument: (id: string, updates: Partial<Document>) => void;
  deleteDocument: (id: string) => void;
  selectDocument: (document: Document | null) => void;
  setLoading: (isLoading: boolean) => void;
  
  // Getters
  getDocumentsByType: (type: string) => Document[];
  getDocumentsByVessel: (vesselId: string) => Document[];
  getExpiringDocuments: (days: number) => Document[];
}

export const useDocumentStore = create<DocumentStore>()((set, get) => ({
  documents: [],
  selectedDocument: null,
  isLoading: false,
  
  setDocuments: (documents) => set({ documents }),
  addDocument: (document) =>
    set((state) => ({ documents: [...state.documents, document] })),
  updateDocument: (id, updates) =>
    set((state) => ({
      documents: state.documents.map((d) =>
        d.id === id ? { ...d, ...updates } : d
      ),
    })),
  deleteDocument: (id) =>
    set((state) => ({
      documents: state.documents.filter((d) => d.id !== id),
      selectedDocument: state.selectedDocument?.id === id ? null : state.selectedDocument,
    })),
  selectDocument: (document) => set({ selectedDocument: document }),
  setLoading: (isLoading) => set({ isLoading }),
  
  getDocumentsByType: (type) =>
    get().documents.filter((d) => d.type === type),
  getDocumentsByVessel: (vesselId) =>
    get().documents.filter((d) => d.vesselId === vesselId),
  getExpiringDocuments: (days) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);
    return get().documents.filter((d) => {
      if (!d.metadata.expiryDate) return false;
      const expiry = new Date(d.metadata.expiryDate);
      return expiry <= cutoff && expiry >= new Date();
    });
  },
}));

// ============================================================================
// LOG & TASK STORE
// ============================================================================

interface LogTaskStore {
  logs: LogEntry[];
  tasks: Task[];
  selectedLog: LogEntry | null;
  selectedTask: Task | null;
  
  // Actions
  setLogs: (logs: LogEntry[]) => void;
  addLog: (log: LogEntry) => void;
  updateLog: (id: string, updates: Partial<LogEntry>) => void;
  deleteLog: (id: string) => void;
  selectLog: (log: LogEntry | null) => void;
  
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  selectTask: (task: Task | null) => void;
  completeTask: (id: string, completedBy: string, note?: string) => void;
  approveTask: (taskId: string, approval: { approverId: string; approverName: string; status: 'approved' | 'rejected'; note?: string }) => void;
  
  // Getters
  getOpenTasks: () => Task[];
  getOverdueTasks: () => Task[];
  getTasksByVessel: (vesselId: string) => Task[];
  getLogsByVessel: (vesselId: string) => LogEntry[];
}

export const useLogTaskStore = create<LogTaskStore>()((set, get) => ({
  logs: [],
  tasks: [],
  selectedLog: null,
  selectedTask: null,
  
  setLogs: (logs) => set({ logs }),
  addLog: (log) => set((state) => ({ logs: [log, ...state.logs] })),
  updateLog: (id, updates) =>
    set((state) => ({
      logs: state.logs.map((l) => (l.id === id ? { ...l, ...updates } : l)),
    })),
  deleteLog: (id) =>
    set((state) => ({
      logs: state.logs.filter((l) => l.id !== id),
      selectedLog: state.selectedLog?.id === id ? null : state.selectedLog,
    })),
  selectLog: (log) => set({ selectedLog: log }),
  
  setTasks: (tasks) => set({ tasks }),
  addTask: (task) => set((state) => ({ tasks: [...state.tasks, task] })),
  updateTask: (id, updates) =>
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...updates } : t)),
    })),
  deleteTask: (id) =>
    set((state) => ({
      tasks: state.tasks.filter((t) => t.id !== id),
      selectedTask: state.selectedTask?.id === id ? null : state.selectedTask,
    })),
  selectTask: (task) => set({ selectedTask: task }),
  completeTask: (id, completedBy, note) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id
          ? {
              ...t,
              status: (t.requiresApproval ? 'needs_approval' : 'complete') as Task['status'],
              completedAt: new Date().toISOString(),
              signOffNote: note,
              signedOffBy: completedBy,
              signedOffAt: new Date().toISOString(),
            }
          : t
      ),
    })),
  approveTask: (taskId, approval) =>
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              approvals: [
                ...(t.approvals || []),
                {
                  id: crypto.randomUUID(),
                  approverId: approval.approverId,
                  approverName: approval.approverName,
                  status: approval.status,
                  timestamp: new Date().toISOString(),
                  note: approval.note,
                },
              ],
              status: (approval.status === 'approved' ? 'complete' : 'open') as Task['status'],
            }
          : t
      ),
    })),
  
  getOpenTasks: () => get().tasks.filter((t) => t.status === 'open' || t.status === 'in_progress'),
  getOverdueTasks: () => {
    const now = new Date();
    return get().tasks.filter(
      (t) =>
        (t.status === 'open' || t.status === 'in_progress') &&
        t.dueDate &&
        new Date(t.dueDate) < now
    );
  },
  getTasksByVessel: (vesselId) => get().tasks.filter((t) => t.vesselId === vesselId),
  getLogsByVessel: (vesselId) => get().logs.filter((l) => l.vesselId === vesselId),
}));

// ============================================================================
// TELEMETRY STORE
// ============================================================================

interface TelemetryStore {
  messages: TelemetryMessage[];
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
  
  // Actions
  addMessage: (message: TelemetryMessage) => void;
  setMessages: (messages: TelemetryMessage[]) => void;
  clearOldMessages: (maxAge: number) => void;
  
  // Getters
  getLatestByType: (type: string) => TelemetryMessage | undefined;
}

export const useTelemetryStore = create<TelemetryStore>()((set, get) => ({
  messages: [],
  latestPosition: null,
  latestMotion: null,
  latestEnvironment: null,
  latestEngine: {},
  aisTargets: [],
  
  addMessage: (message) => {
    set((state) => {
      const newState: Partial<TelemetryStore> = {
        messages: [message, ...state.messages].slice(0, 1000),
      };
      
      // Update derived state based on message type
      switch (message.messageType) {
        case 'position': {
          const pos = message.payload as { latitude: number; longitude: number; cog: number; sog: number };
          newState.latestPosition = {
            latitude: pos.latitude,
            longitude: pos.longitude,
            cog: pos.cog,
            sog: pos.sog,
            source: 'gps',
            timestamp: message.timestamp,
          };
          break;
        }
        case 'motion': {
          const motion = message.payload as { roll: number; pitch: number; yaw: number };
          newState.latestMotion = motion;
          break;
        }
        case 'environment': {
          const env = message.payload as {
            depth?: number;
            waterTemperature?: number;
            windSpeed?: number;
            windDirection?: number;
            barometricPressure?: number;
          };
          newState.latestEnvironment = {
            depth: env.depth,
            waterTemp: env.waterTemperature,
            windSpeed: env.windSpeed,
            windDirection: env.windDirection,
            barometricPressure: env.barometricPressure,
          };
          break;
        }
        case 'engine': {
          const eng = message.payload as { engineId: string; rpm?: number; temperature?: number; runtimeHours: number };
          newState.latestEngine = {
            ...state.latestEngine,
            [eng.engineId]: {
              rpm: eng.rpm,
              temp: eng.temperature,
              hours: eng.runtimeHours,
            },
          };
          break;
        }
        case 'ais': {
          const ais = message.payload as {
            mmsi: string;
            name?: string;
            position: { latitude: number; longitude: number };
            cog: number;
            sog: number;
          };
          const existingTargets = state.aisTargets.filter((t) => t.mmsi !== ais.mmsi);
          newState.aisTargets = [
            ...existingTargets,
            {
              mmsi: ais.mmsi,
              name: ais.name,
              position: ais.position,
              cog: ais.cog,
              sog: ais.sog,
              lastUpdate: message.timestamp,
            },
          ].slice(-50);
          break;
        }
      }
      
      return newState as TelemetryStore;
    });
  },
  
  setMessages: (messages) => set({ messages }),
  
  clearOldMessages: (maxAge) => {
    const cutoff = Date.now() - maxAge;
    set((state) => ({
      messages: state.messages.filter((m) => new Date(m.timestamp).getTime() > cutoff),
    }));
  },
  
  getLatestByType: (type) =>
    get().messages.find((m) => m.messageType === type),
}));

// ============================================================================
// NAVIGATION PLAN STORE
// ============================================================================

interface NavigationPlanStore {
  routes: Route[];
  activeRouteId: string | null;

  setRoutes: (routes: Route[]) => void;
  addRoute: (route: Route) => void;
  updateRoute: (id: string, updates: Partial<Route>) => void;
  deleteRoute: (id: string) => void;
  setActiveRoute: (routeId: string | null) => void;
  getActiveRoute: () => Route | null;
  seedNBPilotReferenceRoute: () => void;
}

export const useNavigationPlanStore = create<NavigationPlanStore>()(
  persist(
    (set, get) => ({
      routes: [NB_PILOT_REFERENCE_ROUTE],
      activeRouteId: NB_PILOT_REFERENCE_ROUTE.id,

      setRoutes: (routes) => set({ routes }),
      addRoute: (route) =>
        set((state) => ({
          routes: [route, ...state.routes.filter((existingRoute) => existingRoute.id !== route.id)],
          activeRouteId: route.id,
        })),
      updateRoute: (id, updates) =>
        set((state) => ({
          routes: state.routes.map((route) =>
            route.id === id ? { ...route, ...updates, updatedAt: new Date().toISOString() } : route
          ),
        })),
      deleteRoute: (id) =>
        set((state) => {
          const routes = state.routes.filter((route) => route.id !== id);
          return {
            routes,
            activeRouteId: state.activeRouteId === id ? routes[0]?.id ?? null : state.activeRouteId,
          };
        }),
      setActiveRoute: (routeId) => set({ activeRouteId: routeId }),
      getActiveRoute: () => {
        const state = get();
        return state.routes.find((route) => route.id === state.activeRouteId) ?? null;
      },
      seedNBPilotReferenceRoute: () =>
        set((state) => ({
          routes: [
            NB_PILOT_REFERENCE_ROUTE,
            ...state.routes.filter((route) => route.id !== NB_PILOT_REFERENCE_ROUTE.id),
          ],
          activeRouteId: NB_PILOT_REFERENCE_ROUTE.id,
        })),
    }),
    {
      name: 'harbormesh-navigation-plans',
      partialize: (state) => ({
        routes: state.routes,
        activeRouteId: state.activeRouteId,
      }),
    }
  )
);

// ============================================================================
// AI STORE
// ============================================================================

interface AIStore {
  providers: AIProviderConfig[];
  activeProvider: AIProviderConfig | null;
  isProcessing: boolean;
  conversation: Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }>;
  
  // Actions
  setProviders: (providers: AIProviderConfig[]) => void;
  addProvider: (provider: AIProviderConfig) => void;
  updateProvider: (id: string, updates: Partial<AIProviderConfig>) => void;
  deleteProvider: (id: string) => void;
  setActiveProvider: (provider: AIProviderConfig | null) => void;
  setProcessing: (isProcessing: boolean) => void;
  addMessage: (role: 'user' | 'assistant', content: string) => void;
  clearConversation: () => void;
}

export const useAIStore = create<AIStore>()(
  persist(
    (set) => ({
      providers: [],
      activeProvider: null,
      isProcessing: false,
      conversation: [],
      
      setProviders: (providers) => set({ providers }),
      addProvider: (provider) =>
        set((state) => ({ providers: [...state.providers, provider] }),
      ),
      updateProvider: (id, updates) =>
        set((state) => ({
          providers: state.providers.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        })),
      deleteProvider: (id) =>
        set((state) => ({
          providers: state.providers.filter((p) => p.id !== id),
          activeProvider: state.activeProvider?.id === id ? null : state.activeProvider,
        })),
      setActiveProvider: (provider) => set({ activeProvider: provider }),
      setProcessing: (isProcessing) => set({ isProcessing }),
      addMessage: (role, content) =>
        set((state) => ({
          conversation: [
            ...state.conversation,
            { role, content, timestamp: new Date().toISOString() },
          ].slice(-50),
        })),
      clearConversation: () => set({ conversation: [] }),
    }),
    {
      name: 'harbormesh-ai',
      partialize: (state) => ({
        providers: state.providers,
        activeProvider: state.activeProvider,
      }),
    }
  )
);

// ============================================================================
// SETTINGS STORE
// ============================================================================

export type TelemetryMode = 'replay' | 'signalk' | 'simulated';

export interface BoatNodeSettings {
  deviceId: string;
  deviceName: string;
  deviceRegisteredAt?: string;
  telemetryMode: TelemetryMode;
  signalKBaseUrl: string;
  signalKSubscribe: 'self' | 'all' | 'none';
  connectionTimeoutSeconds: number;
  fallbackToReplay: boolean;
  surfaceToTransducerMeters: number;
  transducerToKeelMeters: number;
  capabilities: {
    position: boolean;
    depth: boolean;
    ais: boolean;
    radar: boolean;
    sonar: boolean;
    weather: boolean;
  };
}

export const DEFAULT_BOAT_NODE_SETTINGS: BoatNodeSettings = {
  deviceId: 'boat-node-001',
  deviceName: 'NB Pilot Boat Node',
  telemetryMode: 'replay',
  signalKBaseUrl: 'http://192.168.1.100:3000',
  signalKSubscribe: 'self',
  connectionTimeoutSeconds: 10,
  fallbackToReplay: true,
  surfaceToTransducerMeters: 0.5,
  transducerToKeelMeters: 0.3,
  capabilities: {
    position: true,
    depth: true,
    ais: true,
    radar: false,
    sonar: true,
    weather: false,
  },
};

interface SettingsStore {
  consent: ConsentSettings | null;
  userPreferences: {
    theme: ThemeMode;
    unitSystem: 'metric' | 'imperial' | 'nautical';
    language: string;
    timezone: string;
    dateFormat: string;
    timeFormat: '12h' | '24h';
  };
  boatNode: BoatNodeSettings;
  
  // Actions
  setConsent: (consent: ConsentSettings) => void;
  updateConsent: (updates: Partial<ConsentSettings>) => void;
  setUserPreferences: (preferences: SettingsStore['userPreferences']) => void;
  updateUserPreferences: (updates: Partial<SettingsStore['userPreferences']>) => void;
  updateBoatNodeSettings: (updates: Partial<BoatNodeSettings>) => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      consent: null,
      userPreferences: {
        theme: ThemeMode.AUTO,
        unitSystem: 'nautical' as const,
        language: 'en',
	        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
	        dateFormat: 'YYYY-MM-DD',
	        timeFormat: '24h' as const,
	      },
	      boatNode: DEFAULT_BOAT_NODE_SETTINGS,
	      
	      setConsent: (consent) => set({ consent }),
      updateConsent: (updates) =>
        set((state) => ({
          consent: state.consent ? { ...state.consent, ...updates } : null,
        })),
      setUserPreferences: (preferences) => set({ userPreferences: preferences }),
	      updateUserPreferences: (updates) =>
	        set((state) => ({
	          userPreferences: { ...state.userPreferences, ...updates },
	        })),
	      updateBoatNodeSettings: (updates) =>
	        set((state) => ({
	          boatNode: { ...state.boatNode, ...updates },
	        })),
	    }),
    {
      name: 'harbormesh-settings',
    }
  )
);

// ============================================================================
// COMMUNITY DATA STORE
// ============================================================================

interface CommunityDataStore {
  rawSoundings: RawDepthSounding[];
  uploadBatches: CommunitySyncBatch[];
  hazardBatches: CommunityHazardSyncBatch[];
  hazards: CommunityHazard[];
  addRawSoundings: (soundings: RawDepthSounding[]) => void;
  reportHazard: (hazard: Omit<CommunityHazard, 'id' | 'reportedAt' | 'status'> & { id?: string; reportedAt?: string }) => CommunityHazard;
  getShareableSoundings: () => CommunitySoundingUpload[];
  queueShareableSoundingBatch: (options?: QueueCommunitySoundingBatchOptions) => CommunitySyncBatch | null;
  queueShareableHazardBatch: (options?: QueueCommunityHazardBatchOptions) => CommunityHazardSyncBatch | null;
  markUploadBatchStatus: (
    batchId: string,
    status: CommunitySyncBatchStatus,
    details?: { updatedAt?: string; acknowledgedId?: string; error?: string }
  ) => void;
  markHazardBatchStatus: (
    batchId: string,
    status: CommunitySyncBatchStatus,
    details?: { updatedAt?: string; acknowledgedId?: string; error?: string }
  ) => void;
  getQueuedUploadBatches: () => CommunitySyncBatch[];
  getQueuedHazardBatches: () => CommunityHazardSyncBatch[];
}

export type CommunitySyncBatchStatus = 'queued' | 'sent' | 'acknowledged' | 'failed';

export type CommunitySyncBatch = {
  id: string;
  status: CommunitySyncBatchStatus;
  queuedAt: string;
  updatedAt: string;
  endpoint: string;
  attemptCount: number;
  acknowledgedId?: string;
  lastError?: string;
  payload: CommunitySoundingUploadBatch;
};

export type CommunityHazardPositionUpload = {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  heading?: number;
  speed?: number;
  cog?: number;
  sog?: number;
  source: GeoPosition['source'];
  timestamp: string;
};

export type CommunityHazardSharingState = 'shareable_no_position' | 'shareable_blurred' | 'shareable_full';

export type CommunityHazardUpload = {
  id: string;
  vesselId: string;
  sourceDeviceId?: string;
  type: CommunityHazard['type'];
  severity: CommunityHazard['severity'];
  description: string;
  position?: CommunityHazardPositionUpload;
  reportedAt: string;
  sharingState: CommunityHazardSharingState;
  consentCapturedAt: string;
};

export type CommunityHazardUploadBatch = {
  id: string;
  schemaVersion: 'harbourmesh.community-hazards.v1';
  createdAt: string;
  region: string;
  recordCount: number;
  hazards: CommunityHazardUpload[];
  policy: {
    intendedUse: 'community_reference_overlay';
    officialChartDataIncluded: false;
    containsFullSharedPositions: boolean;
    rawLocalPositionsIncluded: false;
    uploadEndpoint?: string;
  };
};

export type CommunityHazardSyncBatch = Omit<CommunitySyncBatch, 'payload'> & {
  payload: CommunityHazardUploadBatch;
};

export type QueueCommunitySoundingBatchOptions = {
  now?: string;
  endpoint?: string;
  region?: string;
  maxRecords?: number;
};

export type QueueCommunityHazardBatchOptions = {
  now?: string;
  endpoint?: string;
  region?: string;
  maxRecords?: number;
  sharePosition?: SharePositionLevel;
  consentCapturedAt?: string;
};

export type CommunityHazard = {
  id: string;
  vesselId: string;
  sourceDeviceId?: string;
  type: 'traffic' | 'weather' | 'obstruction' | 'shoal' | 'debris' | 'other';
  severity: 'low' | 'medium' | 'high';
  description: string;
  position?: GeoPosition;
  reportedAt: string;
  status: 'local' | 'queued' | 'acknowledged' | 'failed';
};

const DEFAULT_COMMUNITY_SOUNDING_ENDPOINT = '/api/community/soundings';
const DEFAULT_COMMUNITY_HAZARD_ENDPOINT = '/api/community/hazards';
const DEFAULT_COMMUNITY_REGION = 'NB_PILOT';

function toHazardUploadPosition(
  position: GeoPosition | undefined,
  sharePosition: SharePositionLevel
): CommunityHazardPositionUpload | undefined {
  if (!position || sharePosition === SharePositionLevel.NONE) return undefined;

  const basePosition: CommunityHazardPositionUpload = {
    latitude: position.latitude,
    longitude: position.longitude,
    accuracy: position.accuracy,
    altitude: position.altitude,
    heading: position.heading,
    speed: position.speed,
    cog: position.cog,
    sog: position.sog,
    source: position.source,
    timestamp: position.timestamp,
  };

  if (sharePosition === SharePositionLevel.BLURRED) {
    return {
      ...basePosition,
      latitude: Number(position.latitude.toFixed(2)),
      longitude: Number(position.longitude.toFixed(2)),
      accuracy: Math.max(position.accuracy ?? 1000, 1000),
      altitude: undefined,
      heading: undefined,
      speed: undefined,
      cog: undefined,
      sog: undefined,
    };
  }

  return basePosition;
}

function prepareHazardForCommunityUpload(
  hazard: CommunityHazard,
  options: Required<Pick<QueueCommunityHazardBatchOptions, 'sharePosition' | 'consentCapturedAt'>>
): CommunityHazardUpload | null {
  const description = hazard.description.trim();
  if (description.length < 3) return null;

  const position = toHazardUploadPosition(hazard.position, options.sharePosition);
  const sharingState: CommunityHazardSharingState = position
    ? options.sharePosition === SharePositionLevel.FULL
      ? 'shareable_full'
      : 'shareable_blurred'
    : 'shareable_no_position';

  return {
    id: hazard.id,
    vesselId: hazard.vesselId,
    sourceDeviceId: hazard.sourceDeviceId,
    type: hazard.type,
    severity: hazard.severity,
    description,
    position,
    reportedAt: hazard.reportedAt,
    sharingState,
    consentCapturedAt: options.consentCapturedAt,
  };
}

function buildCommunityHazardUploadBatch(
  hazards: CommunityHazard[],
  options: Required<Pick<QueueCommunityHazardBatchOptions, 'now' | 'endpoint' | 'region' | 'sharePosition' | 'consentCapturedAt'>> &
    Pick<QueueCommunityHazardBatchOptions, 'maxRecords'>
): CommunityHazardUploadBatch | null {
  const records = hazards
    .flatMap((hazard) => {
      const upload = prepareHazardForCommunityUpload(hazard, options);
      return upload ? [upload] : [];
    })
    .slice(0, options.maxRecords ?? 100);

  if (records.length === 0) return null;

  return {
    id: crypto.randomUUID(),
    schemaVersion: 'harbourmesh.community-hazards.v1',
    createdAt: options.now,
    region: options.region,
    recordCount: records.length,
    hazards: records,
    policy: {
      intendedUse: 'community_reference_overlay',
      officialChartDataIncluded: false,
      containsFullSharedPositions: records.some((hazard) => hazard.sharingState === 'shareable_full'),
      rawLocalPositionsIncluded: false,
      uploadEndpoint: options.endpoint,
    },
  };
}

export const useCommunityDataStore = create<CommunityDataStore>()(
  persist(
    (set, get) => ({
      rawSoundings: [],
      uploadBatches: [],
      hazardBatches: [],
      hazards: [],
      addRawSoundings: (soundings) =>
        set((state) => {
          const byId = new Map(state.rawSoundings.map((sounding) => [sounding.id, sounding]));

          for (const sounding of soundings) {
            byId.set(sounding.id, sounding);
          }

          return {
            rawSoundings: [...byId.values()]
              .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
              .slice(0, 5000),
          };
        }),
      reportHazard: (hazard) => {
        const nextHazard: CommunityHazard = {
          ...hazard,
          id: hazard.id ?? crypto.randomUUID(),
          reportedAt: hazard.reportedAt ?? new Date().toISOString(),
          status: 'local',
        };

        set((state) => ({
          hazards: [nextHazard, ...state.hazards].slice(0, 500),
        }));

        return nextHazard;
      },
      getShareableSoundings: () =>
        get().rawSoundings.flatMap((sounding) => {
          const upload = prepareSoundingForCommunityUpload(sounding);
          return upload ? [upload] : [];
        }),
      queueShareableSoundingBatch: (options) => {
        const state = get();
        const now = options?.now ?? new Date().toISOString();
        const endpoint = options?.endpoint ?? DEFAULT_COMMUNITY_SOUNDING_ENDPOINT;
        const queuedRecordIds = new Set(
          state.uploadBatches
            .filter((batch) => batch.status !== 'failed')
            .flatMap((batch) => batch.payload.records.map((record) => record.id))
        );
        const candidateSoundings = state.rawSoundings.filter((sounding) => !queuedRecordIds.has(sounding.id));
        const payload = buildCommunitySoundingUploadBatch(candidateSoundings, {
          batchId: crypto.randomUUID(),
          createdAt: now,
          uploadEndpoint: endpoint,
          region: options?.region,
          maxRecords: options?.maxRecords,
        });

        if (!payload) return null;

        const batch: CommunitySyncBatch = {
          id: payload.id,
          status: 'queued',
          queuedAt: now,
          updatedAt: now,
          endpoint,
          attemptCount: 0,
          payload,
        };

        set((current) => ({
          uploadBatches: [batch, ...current.uploadBatches].slice(0, 100),
        }));

        return batch;
      },
      queueShareableHazardBatch: (options) => {
        const state = get();
        const now = options?.now ?? new Date().toISOString();
        const endpoint = options?.endpoint ?? DEFAULT_COMMUNITY_HAZARD_ENDPOINT;
        const queuedHazardIds = new Set(
          state.hazardBatches
            .filter((batch) => batch.status !== 'failed')
            .flatMap((batch) => batch.payload.hazards.map((hazard) => hazard.id))
        );
        const candidateHazards = state.hazards.filter(
          (hazard) => hazard.status !== 'acknowledged' && !queuedHazardIds.has(hazard.id)
        );
        const payload = buildCommunityHazardUploadBatch(candidateHazards, {
          now,
          endpoint,
          region: options?.region ?? DEFAULT_COMMUNITY_REGION,
          maxRecords: options?.maxRecords,
          sharePosition: options?.sharePosition ?? SharePositionLevel.BLURRED,
          consentCapturedAt: options?.consentCapturedAt ?? now,
        });

        if (!payload) return null;

        const batch: CommunityHazardSyncBatch = {
          id: payload.id,
          status: 'queued',
          queuedAt: now,
          updatedAt: now,
          endpoint,
          attemptCount: 0,
          payload,
        };
        const hazardIds = new Set(payload.hazards.map((hazard) => hazard.id));

        set((current) => ({
          hazardBatches: [batch, ...current.hazardBatches].slice(0, 100),
          hazards: current.hazards.map((hazard) =>
            hazardIds.has(hazard.id) ? { ...hazard, status: 'queued' } : hazard
          ),
        }));

        return batch;
      },
      markUploadBatchStatus: (batchId, status, details) =>
        set((state) => ({
          uploadBatches: state.uploadBatches.map((batch) =>
            batch.id === batchId
              ? {
                  ...batch,
                  status,
                  updatedAt: details?.updatedAt ?? new Date().toISOString(),
                  attemptCount: status === 'sent' ? batch.attemptCount + 1 : batch.attemptCount,
                  acknowledgedId: details?.acknowledgedId ?? batch.acknowledgedId,
                  lastError: status === 'failed' ? details?.error ?? 'Upload failed' : undefined,
                }
              : batch
          ),
        })),
      markHazardBatchStatus: (batchId, status, details) =>
        set((state) => {
          const targetBatch = state.hazardBatches.find((batch) => batch.id === batchId);
          const hazardIds = new Set(targetBatch?.payload.hazards.map((hazard) => hazard.id) ?? []);
          const nextHazardStatus =
            status === 'acknowledged'
              ? 'acknowledged'
              : status === 'failed'
                ? 'failed'
                : undefined;

          return {
            hazardBatches: state.hazardBatches.map((batch) =>
              batch.id === batchId
                ? {
                    ...batch,
                    status,
                    updatedAt: details?.updatedAt ?? new Date().toISOString(),
                    attemptCount: status === 'sent' ? batch.attemptCount + 1 : batch.attemptCount,
                    acknowledgedId: details?.acknowledgedId ?? batch.acknowledgedId,
                    lastError: status === 'failed' ? details?.error ?? 'Upload failed' : undefined,
                  }
                : batch
            ),
            hazards: nextHazardStatus
              ? state.hazards.map((hazard) =>
                  hazardIds.has(hazard.id) ? { ...hazard, status: nextHazardStatus } : hazard
                )
              : state.hazards,
          };
        }),
      getQueuedUploadBatches: () => get().uploadBatches.filter((batch) => batch.status === 'queued'),
      getQueuedHazardBatches: () => get().hazardBatches.filter((batch) => batch.status === 'queued'),
    }),
    {
      name: 'harbormesh-community-data',
      partialize: (state) => ({
        rawSoundings: state.rawSoundings,
        uploadBatches: state.uploadBatches,
        hazardBatches: state.hazardBatches,
        hazards: state.hazards,
      }),
    }
  )
);

// ============================================================================
// ONBOARDING STORE
// ============================================================================

interface OnboardingStore {
  isOnboarding: boolean;
  currentStep: number;
  vesselData: Partial<Vessel>;
  spaces: Partial<Space>[];
  items: Partial<Item>[];
  documents: Partial<Document>[];
  aiSuggestions: Array<{ id: string; type: string; title: string; description: string; accepted?: boolean }>;
  
  // Actions
  startOnboarding: () => void;
  completeOnboarding: () => void;
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateVesselData: (data: Partial<Vessel>) => void;
  addSpace: (space: Partial<Space>) => void;
  addItem: (item: Partial<Item>) => void;
  addDocument: (document: Partial<Document>) => void;
  addAISuggestion: (suggestion: { type: string; title: string; description: string }) => void;
  acceptSuggestion: (id: string) => void;
  rejectSuggestion: (id: string) => void;
}

export const useOnboardingStore = create<OnboardingStore>()((set) => ({
  isOnboarding: false,
  currentStep: 0,
  vesselData: {},
  spaces: [],
  items: [],
  documents: [],
  aiSuggestions: [],
  
  startOnboarding: () => set({ isOnboarding: true, currentStep: 0 }),
  completeOnboarding: () => set({ isOnboarding: false }),
  setCurrentStep: (step) => set({ currentStep: step }),
  nextStep: () => set((state) => ({ currentStep: state.currentStep + 1 })),
  prevStep: () => set((state) => ({ currentStep: Math.max(0, state.currentStep - 1) })),
  updateVesselData: (data) =>
    set((state) => ({ vesselData: { ...state.vesselData, ...data } })),
  addSpace: (space) =>
    set((state) => ({ spaces: [...state.spaces, { ...space, id: crypto.randomUUID() }] })),
  addItem: (item) =>
    set((state) => ({ items: [...state.items, { ...item, id: crypto.randomUUID() }] })),
  addDocument: (document) =>
    set((state) => ({ documents: [...state.documents, { ...document, id: crypto.randomUUID() }] })),
  addAISuggestion: (suggestion) =>
    set((state) => ({
      aiSuggestions: [
        ...state.aiSuggestions,
        { ...suggestion, id: crypto.randomUUID() },
      ],
    })),
  acceptSuggestion: (id) =>
    set((state) => ({
      aiSuggestions: state.aiSuggestions.map((s) =>
        s.id === id ? { ...s, accepted: true } : s
      ),
    })),
  rejectSuggestion: (id) =>
    set((state) => ({
      aiSuggestions: state.aiSuggestions.map((s) =>
        s.id === id ? { ...s, accepted: false } : s
      ),
    })),
}));
