/**
 * HarborMesh - Zustand Store
 * Global state management for the application
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
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
} from '@/types';

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
    (set, get) => ({
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
        case 'position':
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
        case 'motion':
          const motion = message.payload as { roll: number; pitch: number; yaw: number };
          newState.latestMotion = motion;
          break;
        case 'environment':
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
        case 'engine':
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
        case 'ais':
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
  
  // Actions
  setConsent: (consent: ConsentSettings) => void;
  updateConsent: (updates: Partial<ConsentSettings>) => void;
  setUserPreferences: (preferences: SettingsStore['userPreferences']) => void;
  updateUserPreferences: (updates: Partial<SettingsStore['userPreferences']>) => void;
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
    }),
    {
      name: 'harbormesh-settings',
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
