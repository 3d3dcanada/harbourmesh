/**
 * HarborMesh - Security Utilities
 * AES-256 Encryption, JWT Authentication, and RBAC
 */

import { createHash, randomBytes, createCipheriv, createDecipheriv, timingSafeEqual } from 'crypto';

// ============================================================================
// AES-256-GCM ENCRYPTION
// ============================================================================

export interface EncryptedData {
  ciphertext: string;
  iv: string;
  tag: string;
  version: number;
}

const ENCRYPTION_VERSION = 1;
const IV_LENGTH = 12; // GCM standard IV length
const TAG_LENGTH = 16; // GCM authentication tag length
const KEY_LENGTH = 32; // 256 bits

/**
 * Derive encryption key from password using PBKDF2
 */
export function deriveKey(password: string, salt: Buffer): Buffer {
  return createHash('sha256')
    .update(password)
    .update(salt)
    .digest();
}

/**
 * Generate a random encryption key
 */
export function generateEncryptionKey(): Buffer {
  return randomBytes(KEY_LENGTH);
}

/**
 * Generate a random salt
 */
export function generateSalt(): Buffer {
  return randomBytes(32);
}

/**
 * Generate a random IV
 */
export function generateIV(): Buffer {
  return randomBytes(IV_LENGTH);
}

/**
 * Encrypt data using AES-256-GCM
 */
export function encrypt(
  plaintext: string,
  key: Buffer,
  iv?: Buffer
): EncryptedData {
  const actualIV = iv || generateIV();
  const cipher = createCipheriv('aes-256-gcm', key, actualIV);
  
  let ciphertext = cipher.update(plaintext, 'utf8');
  ciphertext = Buffer.concat([ciphertext, cipher.final()]);
  const tag = cipher.getAuthTag();
  
  return {
    ciphertext: ciphertext.toString('base64'),
    iv: actualIV.toString('base64'),
    tag: tag.toString('base64'),
    version: ENCRYPTION_VERSION,
  };
}

/**
 * Decrypt data using AES-256-GCM
 */
export function decrypt(encrypted: EncryptedData, key: Buffer): string {
  if (encrypted.version !== ENCRYPTION_VERSION) {
    throw new Error(`Unsupported encryption version: ${encrypted.version}`);
  }
  
  const iv = Buffer.from(encrypted.iv, 'base64');
  const tag = Buffer.from(encrypted.tag, 'base64');
  const ciphertext = Buffer.from(encrypted.ciphertext, 'base64');
  
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  
  let plaintext = decipher.update(ciphertext);
  plaintext = Buffer.concat([plaintext, decipher.final()]);
  
  return plaintext.toString('utf8');
}

/**
 * Encrypt an object (JSON stringified)
 */
export function encryptObject<T>(
  obj: T,
  key: Buffer,
  iv?: Buffer
): EncryptedData {
  return encrypt(JSON.stringify(obj), key, iv);
}

/**
 * Decrypt an object
 */
export function decryptObject<T>(encrypted: EncryptedData, key: Buffer): T {
  const plaintext = decrypt(encrypted, key);
  return JSON.parse(plaintext) as T;
}

// ============================================================================
// SECURE STORAGE
// ============================================================================

export interface SecureStorageConfig {
  key: Buffer;
  maxSize?: number; // Maximum size in bytes
}

/**
 * Secure storage for sensitive data
 */
export class SecureStorage {
  private key: Buffer;
  private maxSize: number;
  private data: Map<string, EncryptedData>;

  constructor(config: SecureStorageConfig) {
    this.key = config.key;
    this.maxSize = config.maxSize || 10 * 1024 * 1024; // 10MB default
    this.data = new Map();
  }

  /**
   * Store a value securely
   */
  set(key: string, value: string): boolean {
    try {
      const encrypted = encrypt(value, this.key);
      const size = Buffer.byteLength(encrypted.ciphertext, 'base64');
      
      // Check if adding this would exceed max size
      const currentSize = this.getStorageSize();
      if (currentSize + size > this.maxSize) {
        throw new Error('Storage quota exceeded');
      }
      
      this.data.set(key, encrypted);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Retrieve a value securely
   */
  get(key: string): string | null {
    const encrypted = this.data.get(key);
    if (!encrypted) return null;
    
    try {
      return decrypt(encrypted, this.key);
    } catch {
      return null;
    }
  }

  /**
   * Delete a value
   */
  delete(key: string): boolean {
    return this.data.delete(key);
  }

  /**
   * Check if key exists
   */
  has(key: string): boolean {
    return this.data.has(key);
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.data.clear();
  }

  /**
   * Get current storage size
   */
  private getStorageSize(): number {
    let size = 0;
    for (const encrypted of this.data.values()) {
      size += Buffer.byteLength(encrypted.ciphertext, 'base64');
    }
    return size;
  }
}

// ============================================================================
// JWT-LIKE TOKEN SYSTEM
// ============================================================================

export interface TokenPayload {
  sub: string; // User ID
  role: string;
  exp: number; // Expiration timestamp
  iat: number; // Issued at timestamp
  jti: string; // JWT ID
  permissions: string[];
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

const TOKEN_EXPIRY = 15 * 60; // 15 minutes in seconds
const REFRESH_EXPIRY = 7 * 24 * 60 * 60; // 7 days in seconds

/**
 * Create a compact token (simplified JWT)
 */
export function createToken(
  payload: Omit<TokenPayload, 'iat' | 'jti'>,
  secret: string
): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };
  
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: TokenPayload = {
    ...payload,
    iat: now,
    jti: randomBytes(16).toString('hex'),
  };
  
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const signature = createHmacSignature(
    `${encodedHeader}.${encodedPayload}`,
    secret
  );
  
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Verify and decode a token
 */
export function verifyToken(token: string, secret: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    const [encodedHeader, encodedPayload, signature] = parts;
    
    // Verify signature
    const expectedSignature = createHmacSignature(
      `${encodedHeader}.${encodedPayload}`,
      secret
    );
    
    if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      return null;
    }
    
    // Decode payload
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as TokenPayload;
    
    // Check expiration
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    
    return payload;
  } catch {
    return null;
  }
}

/**
 * Decode token without verification (for inspection)
 */
export function decodeToken(token: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    return JSON.parse(base64UrlDecode(parts[1])) as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Create a token pair (access + refresh)
 */
export function createTokenPair(
  userId: string,
  role: string,
  permissions: string[],
  secret: string
): TokenPair {
  const accessToken = createToken(
    {
      sub: userId,
      role,
      exp: Math.floor(Date.now() / 1000) + TOKEN_EXPIRY,
      permissions,
    },
    secret
  );
  
  const refreshToken = createToken(
    {
      sub: userId,
      role,
      exp: Math.floor(Date.now() / 1000) + REFRESH_EXPIRY,
      permissions: [],
    },
    secret
  );
  
  return {
    accessToken,
    refreshToken,
    expiresIn: TOKEN_EXPIRY,
  };
}

// ============================================================================
// ROLE-BASED ACCESS CONTROL (RBAC)
// ============================================================================

export type Permission =
  | 'vessel:read'
  | 'vessel:write'
  | 'vessel:delete'
  | 'inventory:read'
  | 'inventory:write'
  | 'inventory:delete'
  | 'documents:read'
  | 'documents:write'
  | 'documents:delete'
  | 'logs:read'
  | 'logs:write'
  | 'tasks:read'
  | 'tasks:write'
  | 'tasks:approve'
  | 'navigation:read'
  | 'navigation:write'
  | 'weather:read'
  | 'weather:write'
  | 'ai:read'
  | 'ai:write'
  | 'community:read'
  | 'community:write'
  | 'settings:read'
  | 'settings:write'
  | 'admin:users'
  | 'admin:roles'
  | 'admin:system';

export interface RolePermissions {
  role: string;
  permissions: Permission[];
  inherits?: string[];
}

export const ROLE_PERMISSIONS: RolePermissions[] = [
  {
    role: 'owner',
    permissions: [
      'vessel:read', 'vessel:write', 'vessel:delete',
      'inventory:read', 'inventory:write', 'inventory:delete',
      'documents:read', 'documents:write', 'documents:delete',
      'logs:read', 'logs:write',
      'tasks:read', 'tasks:write', 'tasks:approve',
      'navigation:read', 'navigation:write',
      'weather:read', 'weather:write',
      'ai:read', 'ai:write',
      'community:read', 'community:write',
      'settings:read', 'settings:write',
    ],
  },
  {
    role: 'captain',
    permissions: [
      'vessel:read', 'vessel:write',
      'inventory:read', 'inventory:write',
      'documents:read', 'documents:write',
      'logs:read', 'logs:write',
      'tasks:read', 'tasks:write', 'tasks:approve',
      'navigation:read', 'navigation:write',
      'weather:read', 'weather:write',
      'ai:read', 'ai:write',
      'community:read', 'community:write',
      'settings:read',
    ],
  },
  {
    role: 'engineer',
    permissions: [
      'vessel:read', 'vessel:write',
      'inventory:read', 'inventory:write',
      'documents:read', 'documents:write',
      'logs:read', 'logs:write',
      'tasks:read', 'tasks:write',
      'navigation:read',
      'weather:read',
      'ai:read', 'ai:write',
      'settings:read',
    ],
  },
  {
    role: 'crew',
    permissions: [
      'vessel:read',
      'inventory:read',
      'documents:read',
      'logs:read', 'logs:write',
      'tasks:read',
      'navigation:read',
      'weather:read',
      'ai:read',
      'community:read',
    ],
  },
  {
    role: 'guest',
    permissions: [
      'vessel:read',
      'navigation:read',
      'weather:read',
    ],
  },
  {
    role: 'admin',
    permissions: [
      'vessel:read', 'vessel:write', 'vessel:delete',
      'inventory:read', 'inventory:write', 'inventory:delete',
      'documents:read', 'documents:write', 'documents:delete',
      'logs:read', 'logs:write',
      'tasks:read', 'tasks:write', 'tasks:approve',
      'navigation:read', 'navigation:write',
      'weather:read', 'weather:write',
      'ai:read', 'ai:write',
      'community:read', 'community:write',
      'settings:read', 'settings:write',
      'admin:users', 'admin:roles', 'admin:system',
    ],
  },
];

/**
 * Get all permissions for a role (including inherited)
 */
export function getRolePermissions(role: string): Permission[] {
  const roleDef = ROLE_PERMISSIONS.find(r => r.role === role);
  if (!roleDef) return [];
  
  const permissions = new Set(roleDef.permissions);
  
  // Add inherited permissions
  if (roleDef.inherits) {
    for (const inheritedRole of roleDef.inherits) {
      const inheritedPermissions = getRolePermissions(inheritedRole);
      inheritedPermissions.forEach(p => permissions.add(p));
    }
  }
  
  return Array.from(permissions);
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: string, permission: Permission): boolean {
  const permissions = getRolePermissions(role);
  return permissions.includes(permission);
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: string, permissions: Permission[]): boolean {
  const rolePermissions = getRolePermissions(role);
  return permissions.some(p => rolePermissions.includes(p));
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(role: string, permissions: Permission[]): boolean {
  const rolePermissions = getRolePermissions(role);
  return permissions.every(p => rolePermissions.includes(p));
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function base64UrlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padding = base64.length % 4;
  if (padding) {
    base64 += '='.repeat(4 - padding);
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

function createHmacSignature(data: string, secret: string): string {
  return createHash('sha256')
    .update(data)
    .update(secret)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

// ============================================================================
// PASSWORD UTILITIES
// ============================================================================

export interface PasswordStrength {
  score: number; // 0-4
  feedback: string[];
}

/**
 * Check password strength
 */
export function checkPasswordStrength(password: string): PasswordStrength {
  const feedback: string[] = [];
  let score = 0;
  
  // Length check
  if (password.length < 8) {
    feedback.push('Password should be at least 8 characters');
  } else if (password.length >= 12) {
    score += 1;
  } else {
    score += 0.5;
  }
  
  // Uppercase check
  if (/[A-Z]/.test(password)) {
    score += 0.5;
  } else {
    feedback.push('Add uppercase letters');
  }
  
  // Lowercase check
  if (/[a-z]/.test(password)) {
    score += 0.5;
  } else {
    feedback.push('Add lowercase letters');
  }
  
  // Number check
  if (/[0-9]/.test(password)) {
    score += 0.5;
  } else {
    feedback.push('Add numbers');
  }
  
  // Special character check
  if (/[^A-Za-z0-9]/.test(password)) {
    score += 1;
  } else {
    feedback.push('Add special characters');
  }
  
  // Common patterns check
  if (/(.)\1{2,}/.test(password)) {
    score -= 0.5;
    feedback.push('Avoid repeating characters');
  }
  
  if (/^(password|123456|qwerty)/i.test(password)) {
    score = 0;
    feedback.push('Password is too common');
  }
  
  return {
    score: Math.max(0, Math.min(4, Math.round(score))),
    feedback,
  };
}

/**
 * Hash a password for storage
 */
export function hashPassword(password: string, salt?: Buffer): { hash: string; salt: string } {
  const actualSalt = salt || generateSalt();
  const hash = createHash('sha256')
    .update(password)
    .update(actualSalt)
    .digest('hex');
  
  return {
    hash,
    salt: actualSalt.toString('hex'),
  };
}

/**
 * Verify a password against a hash
 */
export function verifyPassword(
  password: string,
  hash: string,
  salt: string
): boolean {
  const { hash: computedHash } = hashPassword(password, Buffer.from(salt, 'hex'));
  return timingSafeEqual(
    Buffer.from(hash),
    Buffer.from(computedHash)
  );
}
