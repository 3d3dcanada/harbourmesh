/**
 * HarborMesh - Test Setup & Global Configuration
 * Zero-Tolerance Quality Assurance Infrastructure
 */

import { beforeAll, afterAll, afterEach, vi } from 'vitest';
import '@testing-library/jest-dom';

// ============================================================================
// GLOBAL TEST CONFIGURATION
// ============================================================================

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.VITE_API_URL = 'http://localhost:3001';
process.env.VITE_WS_URL = 'ws://localhost:3001';

// Mock window.crypto for tests
Object.defineProperty(window, 'crypto', {
  value: {
    randomUUID: vi.fn(() => 'test-uuid-' + Math.random().toString(36).substr(2, 9)),
    subtle: {
      encrypt: vi.fn(),
      decrypt: vi.fn(),
      digest: vi.fn(),
      generateKey: vi.fn(),
      importKey: vi.fn(),
      exportKey: vi.fn(),
    },
    getRandomValues: vi.fn((array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256);
      }
      return array;
    }),
  },
  writable: true,
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn((key: string) => {
    return localStorageMock.store[key] || null;
  }),
  setItem: vi.fn((key: string, value: string) => {
    localStorageMock.store[key] = value.toString();
  }),
  removeItem: vi.fn((key: string) => {
    delete localStorageMock.store[key];
  }),
  clear: vi.fn(() => {
    localStorageMock.store = {};
  }),
  store: {} as Record<string, string>,
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn((key: string) => {
    return sessionStorageMock.store[key] || null;
  }),
  setItem: vi.fn((key: string, value: string) => {
    sessionStorageMock.store[key] = value.toString();
  }),
  removeItem: vi.fn((key: string) => {
    delete sessionStorageMock.store[key];
  }),
  clear: vi.fn(() => {
    sessionStorageMock.store = {};
  }),
  store: {} as Record<string, string>,
};

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock,
  writable: true,
});

// ============================================================================
// MOCKS FOR EXTERNAL DEPENDENCIES
// ============================================================================

// Mock Leaflet
vi.mock('leaflet', () => ({
  default: {
    map: vi.fn(() => ({
      setView: vi.fn(),
      addLayer: vi.fn(),
      removeLayer: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
    })),
    tileLayer: vi.fn(() => ({
      addTo: vi.fn(),
    })),
    marker: vi.fn(() => ({
      addTo: vi.fn(),
      bindPopup: vi.fn(),
    })),
    icon: vi.fn(),
    popup: vi.fn(),
  },
  icon: vi.fn(),
  marker: vi.fn(),
}));

// Mock navigator.geolocation
Object.defineProperty(navigator, 'geolocation', {
  value: {
    getCurrentPosition: vi.fn((success, _error) => {
      success({
        coords: {
          latitude: 44.6501,
          longitude: -63.5746,
          accuracy: 10,
          altitude: 0,
          altitudeAccuracy: 0,
          heading: 0,
          speed: 0,
        },
        timestamp: Date.now(),
      });
    }),
    watchPosition: vi.fn(),
    clearWatch: vi.fn(),
  },
  writable: true,
});

// ============================================================================
// TEST UTILITIES
// ============================================================================

/**
 * Create a mock vessel for testing
 */
export function createMockVessel(overrides = {}) {
  return {
    id: 'test-vessel-001',
    ownerId: 'test-user-001',
    name: 'Test Vessel',
    type: 'sailboat_cruiser' as const,
    lengthOverall: 12.5,
    lengthWaterline: 11.0,
    beam: 4.0,
    draft: 1.8,
    displacement: 12000,
    mmsi: '123456789',
    callSign: 'TEST01',
    flag: 'CA',
    portOfRegistry: 'Halifax',
    engines: [],
    tanks: [],
    operationalProfile: {
      primaryUse: 'recreational' as const,
      typicalCrewSize: 2,
      maxPassengers: 6,
      homePort: 'Halifax Marina',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create a mock log entry for testing
 */
export function createMockLogEntry(overrides = {}) {
  return {
    id: 'test-log-001',
    vesselId: 'test-vessel-001',
    userId: 'test-user-001',
    type: 'voyage' as const,
    title: 'Test Voyage',
    description: 'Test voyage entry',
    position: {
      latitude: 44.6501,
      longitude: -63.5746,
      accuracy: 10,
    },
    timestamp: new Date().toISOString(),
    weather: {
      windSpeed: 15,
      windDirection: 180,
      waveHeight: 1.5,
      visibility: 10,
    },
    ...overrides,
  };
}

/**
 * Create a mock task for testing
 */
export function createMockTask(overrides = {}) {
  return {
    id: 'test-task-001',
    vesselId: 'test-vessel-001',
    title: 'Test Task',
    description: 'Test task description',
    type: 'maintenance' as const,
    status: 'open' as const,
    priority: 'medium' as const,
    dueDate: new Date(Date.now() + 86400000).toISOString(),
    assignedTo: 'test-user-001',
    createdBy: 'test-user-001',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create a mock document for testing
 */
export function createMockDocument(overrides = {}) {
  return {
    id: 'test-doc-001',
    vesselId: 'test-vessel-001',
    name: 'Test Document',
    type: 'manual' as const,
    mimeType: 'application/pdf',
    size: 1024000,
    url: '/documents/test.pdf',
    metadata: {
      expiryDate: new Date(Date.now() + 31536000000).toISOString(),
      tags: ['test', 'manual'],
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create a mock item for testing
 */
export function createMockItem(overrides = {}) {
  return {
    id: 'test-item-001',
    vesselId: 'test-vessel-001',
    spaceId: 'test-space-001',
    name: 'Test Item',
    category: 'safety' as const,
    quantity: 1,
    unit: 'each',
    location: 'Test Locker',
    minQuantity: 1,
    lastRestocked: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create a mock user for testing
 */
export function createMockUser(overrides = {}) {
  return {
    id: 'test-user-001',
    email: 'test@example.com',
    name: 'Test User',
    role: 'owner' as const,
    avatarUrl: undefined,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Create a mock telemetry message for testing
 */
export function createMockTelemetry(overrides = {}) {
  return {
    id: 'test-telemetry-001',
    vesselId: 'test-vessel-001',
    type: 'position' as const,
    timestamp: new Date().toISOString(),
    data: {
      latitude: 44.6501,
      longitude: -63.5746,
      speed: 6.5,
      course: 180,
      heading: 185,
      accuracy: 5,
    },
    ...overrides,
  };
}

// ============================================================================
// CLEANUP FUNCTIONS
// ============================================================================

beforeAll(() => {
  // Set up any global test state
});

afterAll(() => {
  // Clean up global test state
});

afterEach(() => {
  // Clear all mocks
  vi.clearAllMocks();
  
  // Reset localStorage mock
  localStorageMock.store = {};
  sessionStorageMock.store = {};
  
  // Clear any timers
  vi.clearAllTimers();
});

// ============================================================================
// EXTEND JEST MATCHERS
// ============================================================================

// Add custom matchers here if needed
declare global {
  namespace Vi {
    interface Jest {
      // Custom assertions
    }
  }
}
