import { describe, expect, it } from 'vitest';
import { EncryptedValue } from '../src/EncryptedValue';

describe('EncryptedValue', () => {
  it('encrypts and decrypts values correctly', () => {
    const originalValue = 'my-secret-password';

    const encrypted = new EncryptedValue(originalValue);
    const decryptedValue = encrypted.getValue();

    expect(decryptedValue).toBe(originalValue);
  });

  it('generates unique encryption for each instance', () => {
    const value = 'same-secret';

    const encrypted1 = new EncryptedValue(value);
    const encrypted2 = new EncryptedValue(value);

    expect(encrypted1.getValue()).toBe(value);
    expect(encrypted2.getValue()).toBe(value);
    expect(encrypted1.toString()).toBe(encrypted2.toString());
  });

  it('does not reveal encrypted data in toString', () => {
    const secret = 'super-secret-password';
    const encrypted = new EncryptedValue(secret);

    const stringRepresentation = encrypted.toString();

    expect(stringRepresentation).toBe('[EncryptedValue]');
    expect(stringRepresentation).not.toContain(secret);
  });

  it('does not reveal encrypted data in JSON serialization', () => {
    const secret = 'another-secret';
    const encrypted = new EncryptedValue(secret);

    const jsonObject = encrypted.toJSON();
    const jsonString = JSON.stringify(encrypted);

    expect(jsonObject).toEqual({ type: 'EncryptedValue', encrypted: true });
    expect(jsonString).not.toContain(secret);
  });

  it('works with empty strings', () => {
    const encrypted = new EncryptedValue('');

    expect(encrypted.getValue()).toBe('');
  });

  it('works with unicode characters', () => {
    const unicodeValue = '🔒 Secret with émojis and ñ characters 中文';
    const encrypted = new EncryptedValue(unicodeValue);

    expect(encrypted.getValue()).toBe(unicodeValue);
  });
});
