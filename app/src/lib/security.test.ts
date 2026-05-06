import { createHash } from 'crypto';
import { describe, expect, it } from 'vitest';
import {
  PBKDF2_SHA256_ITERATIONS,
  createToken,
  deriveKey,
  hashPassword,
  verifyPassword,
  verifyToken,
} from './security';

describe('security helpers', () => {
  it('derives encryption keys with PBKDF2 instead of a single SHA-256 pass', () => {
    const password = 'correct horse battery staple';
    const salt = Buffer.from('00112233445566778899aabbccddeeff', 'hex');
    const key = deriveKey(password, salt);
    const singlePass = createHash('sha256').update(password).update(salt).digest('hex');

    expect(PBKDF2_SHA256_ITERATIONS).toBeGreaterThanOrEqual(600_000);
    expect(key).toHaveLength(32);
    expect(key.toString('hex')).not.toBe(singlePass);
    expect(deriveKey(password, salt).equals(key)).toBe(true);
  });

  it('hashes and verifies passwords with salted PBKDF2-HMAC-SHA256', () => {
    const salt = Buffer.from('fedcba99887766554433221100ffeedd', 'hex');
    const password = 'Longer local passphrase 42!';
    const { hash, salt: storedSalt } = hashPassword(password, salt);
    const singlePass = createHash('sha256').update(password).update(salt).digest('hex');

    expect(storedSalt).toBe(salt.toString('hex'));
    expect(hash).not.toBe(singlePass);
    expect(verifyPassword(password, hash, storedSalt)).toBe(true);
    expect(verifyPassword('wrong password', hash, storedSalt)).toBe(false);
    expect(verifyPassword(password, 'short', storedSalt)).toBe(false);
  });

  it('rejects tampered HMAC-signed tokens', () => {
    const secret = 'development-secret';
    const token = createToken({
      sub: 'user-1',
      role: 'captain',
      exp: Math.floor(Date.now() / 1000) + 60,
      permissions: ['navigation:read'],
    }, secret);
    const [header, payload] = token.split('.');
    const tamperedToken = `${header}.${payload}.bad-signature`;

    expect(verifyToken(token, secret)).toMatchObject({
      sub: 'user-1',
      role: 'captain',
    });
    expect(verifyToken(tamperedToken, secret)).toBeNull();
  });
});
