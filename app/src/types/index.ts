/**
 * HarborMesh - Core TypeScript Schemas and Data Models
 * AI-Powered Boating Ecosystem Platform
 */

// ============================================================================
// ENUMS
// ============================================================================

export enum VesselType {
  KAYAK = 'kayak',
  CANOE = 'canoe',
  SUP = 'sup',
  SAILBOAT_DINGHY = 'sailboat_dinghy',
  SAILBOAT_DAYSAILOR = 'sailboat_daysailor',
  SAILBOAT_CRUISER = 'sailboat_cruiser',
  SAILBOAT_RACING = 'sailboat_racing',
  MOTORBOAT_CENTER_CONSOLE = 'motorboat_center_console',
  MOTORBOAT_BOWRIDER = 'motorboat_bowrider',
  MOTORBOAT_CRUISER = 'motorboat_cruiser',
  MOTORBOAT_SPORTFISH = 'motorboat_sportfish',
  TRAWLER = 'trawler',
  CATAMARAN_SAILING = 'catamaran_sailing',
  CATAMARAN_POWER = 'catamaran_power',
  TRIMARAN = 'trimaran',
  YACHT_FLYBRIDGE = 'yacht_flybridge',
  YACHT_EXPEDITION = 'yacht_expedition',
  YACHT_SUPER = 'yacht_super',
  COMMERCIAL_FERRY = 'commercial_ferry',
  COMMERCIAL_TOW = 'commercial_tow',
  COMMERCIAL_FISHING = 'commercial_fishing',
}

export enum SpaceType {
  COCKPIT = 'cockpit',
  CABIN = 'cabin',
  LOCKER = 'locker',
  COMPARTMENT = 'compartment',
  BILGE = 'bilge',
  GALLEY = 'galley',
  HEAD = 'head',
  BERTH = 'berth',
  SALON = 'salon',
  ENGINE_ROOM = 'engine_room',
  LAZARETTE = 'lazarette',
  ANCHOR_LOCKER = 'anchor_locker',
  DECK_STORAGE = 'deck_storage',
  FLYBRIDGE = 'flybridge',
  TENDER_GARAGE = 'tender_garage',
  FUEL_TANK = 'fuel_tank',
  WATER_TANK = 'water_tank',
  HOLD = 'hold',
  CUSTOM = 'custom',
}

export enum ItemCategory {
  FASTENERS = 'fasteners',
  SPARES = 'spares',
  TOOLS = 'tools',
  GALLEY = 'galley',
  SAFETY = 'safety',
  ELECTRONICS = 'electronics',
  ELECTRICAL = 'electrical',
  PLUMBING = 'plumbing',
  RIGGING = 'rigging',
  ENGINE = 'engine',
  NAVIGATION = 'navigation',
  COMMUNICATION = 'communication',
  CLEANING = 'cleaning',
  LINES = 'lines',
  FENDERS = 'fenders',
  ANCHORING = 'anchoring',
  CANVAS = 'canvas',
  DOCUMENTS = 'documents',
  MEDICAL = 'medical',
  FISHING = 'fishing',
  DIVING = 'diving',
  TENDER = 'tender',
  CUSTOM = 'custom',
}

export enum DocumentType {
  MANUAL = 'manual',
  SURVEY = 'survey',
  REGISTRATION = 'registration',
  INSURANCE = 'insurance',
  COMPLIANCE_CERTIFICATE = 'compliance_certificate',
  PASSPORT = 'passport',
  VISA = 'visa',
  LICENSE = 'license',
  MEDICAL_CERTIFICATE = 'medical_certificate',
  CREW_AGREEMENT = 'crew_agreement',
  CHARTER_AGREEMENT = 'charter_agreement',
  BILL_OF_SALE = 'bill_of_sale',
  WARRANTY = 'warranty',
  INVOICE = 'invoice',
  MAINTENANCE_RECORD = 'maintenance_record',
  PHOTO = 'photo',
  VIDEO = 'video',
  OTHER = 'other',
}

export enum LogEntryType {
  VOYAGE = 'voyage',
  ENGINE_HOURS = 'engine_hours',
  MAINTENANCE = 'maintenance',
  INCIDENT = 'incident',
  INSPECTION = 'inspection',
  FUELING = 'fueling',
  WEATHER_OBSERVATION = 'weather_observation',
  CREW_CHANGE = 'crew_change',
  SYSTEM_CHECK = 'system_check',
  CUSTOM = 'custom',
}

export enum TaskType {
  MAINTENANCE = 'maintenance',
  SAFETY = 'safety',
  DOCUMENTATION = 'documentation',
  CHECKLIST_ITEM = 'checklist_item',
  INSPECTION = 'inspection',
  REPAIR = 'repair',
  CLEANING = 'cleaning',
  PROVISIONING = 'provisioning',
  CUSTOM = 'custom',
}

export enum TaskStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  COMPLETE = 'complete',
  NEEDS_APPROVAL = 'needs_approval',
  CANCELLED = 'cancelled',
}

export type TaskStatusType = 'open' | 'in_progress' | 'complete' | 'needs_approval' | 'cancelled';

export enum SystemType {
  ELECTRICAL = 'electrical',
  PLUMBING = 'plumbing',
  RIGGING = 'rigging',
  ENGINE = 'engine',
  STEERING = 'steering',
  FUEL = 'fuel',
  HVAC = 'hvac',
  NAVIGATION = 'navigation',
  COMMUNICATION = 'communication',
  SAFETY = 'safety',
  PROPULSION = 'propulsion',
  HYDRAULICS = 'hydraulics',
  CUSTOM = 'custom',
}

export enum UserRole {
  OWNER = 'owner',
  CAPTAIN = 'captain',
  ENGINEER = 'engineer',
  CREW = 'crew',
  GUEST = 'guest',
  ADMIN = 'admin',
  CHARTER_MANAGER = 'charter_manager',
  FLEET_MANAGER = 'fleet_manager',
}

export type UserRoleType = 'owner' | 'captain' | 'engineer' | 'crew' | 'guest' | 'admin' | 'charter_manager' | 'fleet_manager';

export enum TelemetryMessageType {
  POSITION = 'position',
  MOTION = 'motion',
  ENVIRONMENT = 'environment',
  ENGINE = 'engine',
  NAVIGATION = 'navigation',
  AIS = 'ais',
  HEALTH = 'health',
  WEATHER = 'weather',
}

export enum SharePositionLevel {
  NONE = 'none',
  BLURRED = 'blurred',
  FULL = 'full',
}

export enum AIProviderType {
  LOCAL = 'local',
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  CUSTOM = 'custom',
}

export enum Severity {
  INFO = 'info',
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export type SeverityType = 'info' | 'low' | 'medium' | 'high' | 'critical';

export enum ThemeMode {
  DAY = 'day',
  NIGHT = 'night',
  AUTO = 'auto',
}

export type ThemeModeType = 'day' | 'night' | 'auto';

export enum UnitSystem {
  METRIC = 'metric',
  IMPERIAL = 'imperial',
  NAUTICAL = 'nautical',
}

// ============================================================================
// CORE ENTITY INTERFACES
// ============================================================================

export interface Vessel {
  id: string;
  ownerId: string;
  name: string;
  type: VesselType;
  
  // Dimensions
  lengthOverall: number; // meters
  lengthWaterline: number; // meters
  beam: number; // meters
  draft: number; // meters
  displacement?: number; // kg
  tonnage?: number; // gross tons
  
  // Identification
  mmsi?: string;
  callSign?: string;
  hin?: string; // Hull Identification Number
  registrationNumber?: string;
  flag?: string; // Country code
  portOfRegistry?: string;
  
  // Systems
  engines: Engine[];
  tanks: Tank[];
  
  // Operational
  operationalProfile: OperationalProfile;
  
  // Deck plan / boat map
  deckPlan?: {
    hullPoints: Array<{ x: number; y: number }>;
    secondaryHullPoints?: Array<{ x: number; y: number }>; // catamaran port hull
    templateId?: string;
    blueprintImageUrl?: string;
    blueprintOpacity?: number; // 0-1, default 0.3
  };

  // Metadata
  createdAt: string;
  updatedAt: string;
  photoUrl?: string;
}

export interface Engine {
  id: string;
  vesselId: string;
  name: string;
  type: 'inboard' | 'outboard' | 'sterndrive' | 'jet' | 'saildrive' | 'electric';
  make?: string;
  model?: string;
  serialNumber?: string;
  power?: number; // kW
  fuelType?: 'diesel' | 'gasoline' | 'electric' | 'hybrid';
  year?: number;
  hours: number;
  installedAt: string;
}

export interface Tank {
  id: string;
  vesselId: string;
  name: string;
  type: 'fuel' | 'diesel' | 'gasoline' | 'water' | 'waste' | 'blackwater' | 'greywater' | 'lpg' | 'other';
  capacity: number; // liters
  currentLevel?: number; // liters
  location?: string;
  sensorId?: string;
}

export interface OperationalProfile {
  primaryUse: 'recreational' | 'charter' | 'commercial' | 'racing' | 'fishing' | 'expedition';
  typicalCrewSize: number;
  maxPassengers: number;
  homePort?: string;
  typicalCruisingRange?: number; // nautical miles
  typicalTripDuration?: number; // hours
}

// Geometry types for Space deck plan — discriminated union, backward-compat
export type RectGeometry = {
  kind: 'rect';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
};

export type PolygonGeometry = {
  kind: 'polygon';
  points: Array<{ x: number; y: number }>;
  rotation?: number;
};

export type SpaceGeometry = RectGeometry | PolygonGeometry;

export interface Space {
  id: string;
  vesselId: string;
  name: string;
  type: SpaceType;
  parentSpaceId?: string;

  // Geometry for deck plan
  geometry?: SpaceGeometry;
  
  // Location
  deck?: number; // 0 = main, positive = up, negative = down
  deckName?: string;
  
  // Description
  description?: string;
  notes?: string;
  
  // QR/NFC tagging
  qrCode?: string;
  nfcTag?: string;
  
  // Photos
  photos?: string[];
  
  createdAt: string;
  updatedAt: string;
}

export interface Item {
  id: string;
  vesselId: string;
  spaceId: string;
  
  // Classification
  category: ItemCategory;
  name: string;
  description?: string;
  
  // Quantity
  quantity: number;
  unit: string;
  
  // Product info
  partNumber?: string;
  manufacturer?: string;
  vendor?: string;
  vendorUrl?: string;
  
  // Inventory management
  reorderThreshold?: number;
  reorderQuantity?: number;
  expiryDate?: string;
  
  // Photos and docs
  photos?: string[];
  documentIds?: string[];
  
  // Tags for search
  tags?: string[];
  
  // Linked systems
  relatedSystemIds?: string[];
  
  createdAt: string;
  updatedAt: string;
}

export interface SystemComponent {
  id: string;
  vesselId: string;
  systemType: SystemType;
  name: string;
  description?: string;
  
  // Location
  spaceIds: string[];
  
  // Components hierarchy
  parentComponentId?: string;
  subComponents?: string[];
  
  // Maintenance
  maintenanceSchedule?: MaintenanceSchedule;
  
  // Documents
  manualDocumentIds?: string[];
  
  // Status
  status: 'operational' | 'degraded' | 'failed' | 'offline' | 'unknown';
  lastCheckedAt?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceSchedule {
  intervalHours?: number;
  intervalMonths?: number;
  intervalCycles?: number;
  lastServiceHours?: number;
  lastServiceDate?: string;
  nextDueHours?: number;
  nextDueDate?: string;
  serviceTasks: string[];
}

export interface Document {
  id: string;
  vesselId: string;
  
  // Ownership - can be vessel-wide or specific person
  ownerId?: string;
  subjectId?: string; // For crew docs (passports, etc.)
  
  type: DocumentType;
  title: string;
  description?: string;
  
  // Storage
  storagePath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  hash: string; // For integrity verification
  
  // Extracted metadata
  metadata: DocumentMetadata;
  
  // Sensitivity
  sensitivity: SensitivityLevel;
  
  // Tags
  tags?: string[];
  
  // Linked entities
  relatedSystemIds?: string[];
  relatedLogIds?: string[];
  
  createdAt: string;
  updatedAt: string;
}

export interface DocumentMetadata {
  issueDate?: string;
  expiryDate?: string;
  documentNumber?: string;
  country?: string;
  authority?: string;
  vesselName?: string;
  registrationNumber?: string;
  extractedText?: string; // OCR result
}

export interface SensitivityLevel {
  level: 'public' | 'internal' | 'confidential' | 'restricted';
  neverForTraining: boolean;
  encryptionRequired: boolean;
  allowedRoles: UserRole[];
}

export interface LogEntry {
  id: string;
  vesselId: string;
  type: LogEntryType;
  
  // When & Where
  timestamp: string;
  timezone?: string;
  position?: GeoPosition;
  
  // Content
  summary: string;
  details?: string;
  
  // Related entities
  relatedSystemIds?: string[];
  relatedTaskIds?: string[];
  relatedDocumentIds?: string[];
  
  // For engine logs
  engineHours?: Record<string, number>; // engineId -> hours
  
  // For incidents
  severity?: Severity;
  
  // Creator
  createdBy: string;
  createdByName: string;
  
  // Attachments
  attachments?: string[];
  
  // Weather at time
  weatherSnapshot?: WeatherSnapshot;
  
  createdAt: string;
  updatedAt: string;
}

export interface GeoPosition {
  latitude: number;
  longitude: number;
  accuracy?: number; // meters
  altitude?: number; // meters
  heading?: number; // degrees true
  speed?: number; // knots
  cog?: number; // course over ground, degrees true
  sog?: number; // speed over ground, knots
  source: 'gps' | 'ais' | 'manual' | 'estimated';
  timestamp: string;
}

export interface WeatherSnapshot {
  windSpeed?: number; // knots
  windDirection?: number; // degrees
  windGust?: number;
  waveHeight?: number; // meters
  wavePeriod?: number; // seconds
  waveDirection?: number;
  airTemperature?: number; // celsius
  barometricPressure?: number; // hPa
  visibility?: number; // nautical miles
  cloudCover?: number; // percent
  conditions?: string;
}

export interface Task {
  id: string;
  vesselId: string;
  title: string;
  description?: string;
  type: TaskType;
  status: TaskStatus;
  
  // Scheduling
  dueDate?: string;
  completedAt?: string;
  
  // Assignment
  createdBy: string;
  assignedTo?: string;
  
  // Relations
  relatedLogId?: string;
  relatedSystemId?: string;
  relatedItemIds?: string[];
  
  // Checklist items (if applicable)
  checklistItems?: ChecklistItem[];
  
  // Approvals
  approvals?: Approval[];
  requiresApproval: boolean;
  
  // Sign-off
  signOffNote?: string;
  signedOffBy?: string;
  signedOffAt?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
  notes?: string;
}

export interface Approval {
  id: string;
  approverId: string;
  approverName: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp?: string;
  note?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  phone?: string;
  
  // Profile
  profilePhoto?: string;
  bio?: string;
  certifications?: Certification[];
  
  // Preferences
  preferences: UserPreferences;
  
  // Roles per vessel
  vesselRoles: VesselRole[];
  
  // Enterprise
  tenantId?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface Certification {
  type: string;
  number: string;
  issuingAuthority: string;
  issueDate: string;
  expiryDate?: string;
  documentId?: string;
}

export interface UserPreferences {
  theme: ThemeMode;
  unitSystem: UnitSystem;
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  notifications: NotificationPreferences;
  aiPreferences: AIPreferences;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  taskReminders: boolean;
  maintenanceAlerts: boolean;
  weatherAlerts: boolean;
  communityUpdates: boolean;
}

export interface AIPreferences {
  defaultProvider: string; // AIProviderConfig id
  allowCloudProcessing: boolean;
  allowTrainingDataUse: boolean;
  autoSummarizeLogs: boolean;
  voiceInput: boolean;
}

export interface VesselRole {
  vesselId: string;
  role: UserRole;
  permissions: Permission[];
  joinedAt: string;
}

export interface Permission {
  resource: string;
  action: 'read' | 'write' | 'delete' | 'admin';
}

// ============================================================================
// TELEMETRY & NAVIGATION
// ============================================================================

export interface TelemetryMessage {
  id: string;
  vesselId: string;
  sourceDeviceId: string;
  timestamp: string;
  receivedAt?: string;
  messageType: TelemetryMessageType;
  payload: TelemetryPayload;
  
  // Quality metrics
  samplingRate?: number; // Hz
  accuracy?: number;
  confidence?: number;
}

export type TelemetryPayload =
  | PositionPayload
  | MotionPayload
  | EnvironmentPayload
  | EnginePayload
  | NavigationPayload
  | AISPayload
  | HealthPayload
  | WeatherPayload;

export interface PositionPayload {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
  cog: number; // course over ground, degrees true
  sog: number; // speed over ground, knots
  fixType?: 'none' | '2d' | '3d' | 'dgps' | 'rtk';
  satellites?: number;
}

export interface MotionPayload {
  roll: number; // degrees, positive starboard down
  pitch: number; // degrees, positive bow down
  yaw: number; // degrees true
  heave?: number; // meters
  surge?: number; // m/s²
  sway?: number; // m/s²
  heaveAccel?: number; // m/s²
  angularVelocity?: {
    x: number;
    y: number;
    z: number;
  };
  linearAcceleration?: {
    x: number;
    y: number;
    z: number;
  };
}

export interface EnvironmentPayload {
  depth?: number; // meters
  depthBelowKeel?: number;
  depthBelowTransducer?: number;
  waterTemperature?: number; // celsius
  windSpeed?: number; // knots
  windDirection?: number; // degrees true
  windSpeedApparent?: number;
  windDirectionApparent?: number;
  barometricPressure?: number; // hPa
  airTemperature?: number; // celsius
  humidity?: number; // percent
  waveHeight?: number; // meters (estimated)
  wavePeriod?: number; // seconds
  waveDirection?: number; // degrees
  currentSpeed?: number; // knots
  currentDirection?: number; // degrees
  visibility?: number; // nautical miles
}

export interface EnginePayload {
  engineId: string;
  rpm?: number;
  temperature?: number; // celsius
  oilPressure?: number; // bar
  oilTemperature?: number; // celsius
  fuelRate?: number; // liters/hour
  fuelLevel?: number; // percent
  coolantTemperature?: number; // celsius
  alternatorVoltage?: number;
  alternatorCurrent?: number;
  runtimeHours: number;
  alarms: EngineAlarm[];
}

export interface EngineAlarm {
  type: 'overtemp' | 'low_oil_pressure' | 'high_coolant_temp' | 'low_fuel' | 'alternator' | 'general';
  severity: Severity;
  message: string;
  timestamp: string;
}

export interface NavigationPayload {
  heading: number; // degrees true
  headingMagnetic?: number;
  variation?: number;
  deviation?: number;
  targetWaypoint?: Waypoint;
  routeId?: string;
  routeProgress?: number; // percent
  xte?: number; // cross track error, nautical miles
  dtg?: number; // distance to go, nautical miles
  ttg?: number; // time to go, minutes
  mode: 'standby' | 'heading_hold' | 'wind_vane' | 'track' | 'route';
  source: 'manual' | 'autopilot' | 'gps';
}

export interface Waypoint {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

export interface AISPayload {
  mmsi: string;
  name?: string;
  callSign?: string;
  vesselType?: string;
  length?: number;
  beam?: number;
  draft?: number;
  destination?: string;
  eta?: string;
  position: {
    latitude: number;
    longitude: number;
  };
  cog: number;
  sog: number;
  heading?: number;
  navStatus?: string;
  timestamp: string;
}

export interface HealthPayload {
  deviceId: string;
  deviceType: string;
  status: 'healthy' | 'degraded' | 'critical' | 'offline';
  cpuUsage?: number;
  memoryUsage?: number;
  diskUsage?: number;
  temperature?: number;
  uptime: number;
  lastUpdate: string;
  errors?: string[];
}

export interface WeatherPayload {
  source: 'sensor' | 'api' | 'forecast';
  temperature?: number;
  humidity?: number;
  pressure?: number;
  windSpeed?: number;
  windDirection?: number;
  precipitation?: number;
  conditions?: string;
  forecastTime?: string;
}

// ============================================================================
// COMMUNITY & CLOUD
// ============================================================================

export interface CommunityTrackSegment {
  id: string;
  anonymizedVesselClass: string; // size/type/category only
  polyline: TrackPoint[];
  
  // Derived stats
  avgSpeed: number;
  maxSpeed: number;
  minSpeed: number;
  seaStateScore: number; // 0-10, roughness estimate
  occupancyDensity: number; // vessels per nm²
  
  // Time window
  startTime: string;
  endTime: string;
  
  // Grid cell for indexing
  gridCell: string;
}

export interface TrackPoint {
  latitude: number;
  longitude: number;
  timestamp: string;
  speed?: number;
  course?: number;
}

export interface CommunityConditionReport {
  id: string;
  area: GeoPolygon | string; // polygon or grid cell
  timeWindow: {
    start: string;
    end: string;
  };
  
  // Aggregated conditions
  seaState: 'calm' | 'slight' | 'moderate' | 'rough' | 'very_rough' | 'high';
  waveHeightRange: { min: number; max: number };
  windRange: { min: number; max: number; direction: number };
  currentRange?: { min: number; max: number; direction: number };
  
  // Traffic
  trafficDensity: 'none' | 'light' | 'moderate' | 'heavy' | 'congested';
  vesselCount: number;
  
  // Hazards
  hazardFlags: HazardFlag[];
  
  // Confidence
  confidence: number;
  sampleCount: number;
}

export interface GeoPolygon {
  type: 'polygon';
  coordinates: [number, number][]; // [lon, lat] pairs
}

export interface HazardFlag {
  type: 'shoal' | 'wreck' | 'obstruction' | 'weather' | 'traffic' | 'other';
  severity: Severity;
  description: string;
  position?: GeoPosition;
  reportedBy?: string;
  reportedAt: string;
  verified: boolean;
}

export interface ConsentSettings {
  vesselId: string;
  userId: string;
  
  // Position sharing
  shareLivePosition: SharePositionLevel;
  positionBlurRadius?: number; // nautical miles
  
  // Telemetry sharing
  shareTelemetryForCommunity: boolean;
  shareTelemetryForTraining: boolean;
  telemetryAnonymization: 'none' | 'basic' | 'full';
  
  // Log sharing
  shareLogsForTraining: boolean;
  logAnonymization: 'none' | 'basic' | 'full';
  
  // Enterprise
  enterpriseLockdownMode: boolean;
  fleetOnlySharing: boolean;
  
  // AI
  allowAICloudProcessing: boolean;
  allowAITrainingUse: boolean;
  
  // Audit
  lastUpdated: string;
  updatedBy: string;
}

// ============================================================================
// AI & ML
// ============================================================================

export interface AIProviderConfig {
  id: string;
  ownerId?: string;
  tenantId?: string;
  
  providerType: AIProviderType;
  name: string;
  description?: string;
  
  // Connection
  apiUrl: string;
  apiKey?: string; // encrypted storage
  
  // Models
  chatModel?: string;
  visionModel?: string;
  embeddingModel?: string;
  
  // Capabilities
  capabilities: AICapability[];
  
  // Routing rules
  defaultForChat: boolean;
  defaultForVision: boolean;
  defaultForEmbeddings: boolean;
  
  // Limits
  maxTokens?: number;
  temperature?: number;
  timeout?: number;
  
  // Status
  isActive: boolean;
  lastTested?: string;
  testStatus?: 'pass' | 'fail' | 'unknown';
}

export interface AICapability {
  type: 'chat' | 'vision' | 'embeddings' | 'function_calling' | 'json_mode';
  supported: boolean;
  modelName?: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: 'text' | 'json';
  tools?: AITool[];
  context?: AIContext;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  toolCalls?: AIToolCall[];
  toolCallId?: string;
}

export interface AITool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface AIToolCall {
  id: string;
  name: string;
  arguments: string;
}

export interface AIContext {
  vesselId?: string;
  userId?: string;
  currentView?: string;
  selectedEntityId?: string;
  selectedEntityType?: string;
}

export interface ChatResponse {
  message: ChatMessage;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  finishReason: string;
  latency: number;
}

export interface EmbedRequest {
  texts: string[];
  model?: string;
}

export interface EmbedResponse {
  embeddings: number[][];
  model: string;
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
}

export interface VisionRequest {
  imageUrl: string;
  prompt: string;
  model?: string;
}

// ============================================================================
// ENTERPRISE / FLEET
// ============================================================================

export interface Tenant {
  id: string;
  name: string;
  type: 'individual' | 'charter' | 'fleet' | 'corporate' | 'government';
  
  // Contact
  contactEmail: string;
  contactPhone?: string;
  address?: Address;
  
  // Billing
  subscriptionTier: SubscriptionTier;
  subscriptionExpiresAt: string;
  
  // Settings
  settings: TenantSettings;
  
  // Vessels
  vesselIds: string[];
  
  // Users
  userIds: string[];
  
  createdAt: string;
  updatedAt: string;
}

export interface Address {
  street: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
}

export type SubscriptionTier = 'free' | 'basic' | 'pro' | 'enterprise' | 'fleet';

export interface TenantSettings {
  requireApprovalForTasks: boolean;
  mandatoryChecklists: boolean;
  documentRetentionDays: number;
  logRetentionDays: number;
  customFields?: Record<string, string>;
}

export interface FleetStatus {
  tenantId: string;
  vessels: VesselStatus[];
  summary: {
    total: number;
    underway: number;
    anchored: number;
    inPort: number;
    offline: number;
    withAlerts: number;
  };
  lastUpdated: string;
}

export interface VesselStatus {
  vesselId: string;
  vesselName: string;
  status: 'underway' | 'anchored' | 'moored' | 'in_port' | 'offline' | 'unknown';
  position?: GeoPosition;
  lastUpdate: string;
  
  // Current conditions
  weatherAtLocation?: WeatherSnapshot;
  
  // Alerts
  alerts: Alert[];
  
  // Crew
  crewOnboard: number;
  
  // Next events
  nextMaintenance?: string;
  nextCertificateExpiry?: string;
}

export interface Alert {
  id: string;
  type: string;
  severity: Severity;
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

export interface Manifest {
  id: string;
  vesselId: string;
  tripId?: string;
  
  // Time
  departureTime?: string;
  estimatedReturn?: string;
  actualReturn?: string;
  
  // People
  crew: ManifestEntry[];
  passengers: ManifestEntry[];
  
  // Status
  status: 'planned' | 'checked_in' | 'underway' | 'completed' | 'cancelled';
  
  // Compliance
  maxPassengers: number;
  lifeJacketCount: number;
  safetyBriefingCompleted: boolean;
  
  createdAt: string;
  updatedAt: string;
}

export interface ManifestEntry {
  id: string;
  personId: string;
  name: string;
  role?: string;
  
  // Documents
  documentIds: string[];
  
  // Check-in
  checkedInAt?: string;
  checkedInBy?: string;
  checkedOutAt?: string;
  checkedOutBy?: string;
  
  // Emergency contact
  emergencyContact?: {
    name: string;
    phone: string;
    relationship?: string;
  };
  
  // Medical
  medicalNotes?: string;
  medications?: string[];
  allergies?: string[];
}

export interface Procedure {
  id: string;
  tenantId: string;
  vesselType?: string; // Optional: vessel type applicability
  
  name: string;
  description?: string;
  category: string;
  
  // Checklist items
  checklistItems: ProcedureChecklistItem[];
  
  // Assignment
  requiredRoles: UserRole[];
  
  // Frequency
  frequency?: 'once' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'per_voyage' | 'per_charter';
  
  // Source
  sourceDocumentId?: string;
  importedFrom?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface ProcedureChecklistItem {
  id: string;
  order: number;
  text: string;
  description?: string;
  required: boolean;
  verificationType: 'visual' | 'measurement' | 'signature' | 'photo' | 'none';
}

export interface ProcedureExecution {
  id: string;
  procedureId: string;
  vesselId: string;
  
  // Execution
  startedAt: string;
  completedAt?: string;
  startedBy: string;
  completedBy?: string;
  
  // Items
  items: ExecutedChecklistItem[];
  
  // Result
  status: 'in_progress' | 'completed' | 'failed' | 'cancelled';
  notes?: string;
  
  // Sign-off
  signedOffBy?: string;
  signedOffAt?: string;
}

export interface ExecutedChecklistItem {
  itemId: string;
  completed: boolean;
  completedAt?: string;
  completedBy?: string;
  notes?: string;
  photoUrl?: string;
  measurement?: number;
  measurementUnit?: string;
}

// ============================================================================
// UI STATE & APP
// ============================================================================

export interface AppState {
  // Current context
  currentVesselId?: string;
  currentUser?: User;
  currentTenant?: Tenant;
  
  // UI state
  sidebarOpen: boolean;
  activeView: ViewType;
  theme: ThemeMode;
  
  // Connection
  connectionStatus: 'online' | 'offline' | 'connecting' | 'error';
  lastSync?: string;
  
  // Notifications
  notifications: AppNotification[];
  
  // Modals/Overlays
  activeModal?: string;
  modalData?: unknown;
}

export type ViewType =
  | 'dashboard'
  | 'vessel'
  | 'map'
  | 'inventory'
  | 'documents'
  | 'logs'
  | 'tasks'
  | 'navigation'
  | 'community'
  | 'ai'
  | 'settings'
  | 'fleet'
  | 'onboarding'
  | 'pricing'
  | 'updates'
  | 'legal';

export interface AppNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  action?: {
    label: string;
    view: ViewType;
    params?: Record<string, unknown>;
  };
}

// ============================================================================
// ROUTING & WEATHER
// ============================================================================

export interface Route {
  id: string;
  vesselId: string;
  name: string;
  description?: string;
  
  waypoints: RouteWaypoint[];
  
  // Calculated
  totalDistance: number; // nautical miles
  estimatedDuration: number; // minutes
  estimatedFuel?: number; // liters
  
  // Status
  status: 'planned' | 'active' | 'completed' | 'cancelled';
  
  // Weather
  weatherConsiderations?: string;
  recommendedDeparture?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface RouteWaypoint {
  id: string;
  order: number;
  name: string;
  latitude: number;
  longitude: number;
  
  // Optional
  arrivalTime?: string;
  departureTime?: string;
  notes?: string;
  
  // Calculated leg data
  distanceFromPrevious?: number;
  courseFromPrevious?: number;
  estimatedTimeFromPrevious?: number;
}

export interface WeatherRoute {
  id: string;
  vesselId: string;
  baseRouteId: string;
  
  // Time range
  departureWindow: {
    earliest: string;
    latest: string;
  };
  
  // Options
  optimizationCriteria: 'comfort' | 'speed' | 'fuel' | 'safety';
  vesselConstraints: VesselConstraints;
  
  // Results
  recommendedRoutes: RouteOption[];
  
  generatedAt: string;
  weatherDataTimestamp: string;
}

export interface VesselConstraints {
  maxWindSpeed: number;
  maxWaveHeight: number;
  maxCurrent: number;
  minDepth: number;
  maxRoll: number;
  maxPitch: number;
}

export interface RouteOption {
  id: string;
  departureTime: string;
  arrivalTime: string;
  duration: number;
  distance: number;
  fuelEstimate?: number;
  
  // Comfort/safety scores
  comfortScore: number; // 0-100
  safetyScore: number; // 0-100
  overallScore: number; // 0-100
  
  // Conditions along route
  conditionsSummary: RouteConditionsSummary;
  
  // Waypoints with conditions
  waypoints: RouteWaypointWithConditions[];
}

export interface RouteConditionsSummary {
  avgWindSpeed: number;
  maxWindSpeed: number;
  avgWaveHeight: number;
  maxWaveHeight: number;
  precipitationChance: number;
  visibility: number;
}

export interface RouteWaypointWithConditions extends RouteWaypoint {
  conditions?: WeatherSnapshot;
  seaState?: string;
  confidence?: number;
}

// ============================================================================
// ONBOARDING
// ============================================================================

export interface OnboardingState {
  vesselId?: string;
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  
  // Collected data
  vesselInfo?: Partial<Vessel>;
  spacesCreated: number;
  itemsAdded: number;
  documentsUploaded: number;
  
  // AI assistance
  aiSuggestions: AISuggestion[];
  
  // Progress
  progress: number; // 0-100
}

export type OnboardingStep = 
  | 'welcome'
  | 'vessel_details'
  | 'blueprint'
  | 'spaces'
  | 'inventory'
  | 'documents'
  | 'systems'
  | 'ai_setup'
  | 'complete';

export interface AISuggestion {
  id: string;
  type: 'space' | 'item' | 'document' | 'task' | 'system';
  title: string;
  description: string;
  accepted: boolean | null;
  applied: boolean;
  data?: unknown;
}

// ============================================================================
// API RESPONSES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    timestamp: string;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface WebSocketMessage {
  type: 'telemetry' | 'notification' | 'sync' | 'command' | 'error';
  timestamp: string;
  payload: unknown;
}
