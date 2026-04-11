import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

export class EncryptedValue {
  private readonly encryptedData: Buffer;
  private readonly iv: Buffer;
  private readonly authTag: Buffer;
  private readonly key: Buffer;

  public constructor(value: string) {
    this.key = randomBytes(32);
    this.iv = randomBytes(16);

    const cipher = createCipheriv('aes-256-gcm', this.key, this.iv);

    const encryptedChunks: Buffer[] = [];
    encryptedChunks.push(cipher.update(value, 'utf8'));
    encryptedChunks.push(cipher.final());

    this.encryptedData = Buffer.concat(encryptedChunks);
    this.authTag = cipher.getAuthTag();
  }

  public getValue(): string {
    const decipher = createDecipheriv('aes-256-gcm', this.key, this.iv);
    decipher.setAuthTag(this.authTag);

    try {
      const decryptedChunks: Buffer[] = [];
      decryptedChunks.push(decipher.update(this.encryptedData));
      decryptedChunks.push(decipher.final());

      return Buffer.concat(decryptedChunks).toString('utf8');
    } catch (_) {
      // Hide internal error details
      throw new Error('Failed to decrypt value: Invalid key or corrupted data');
    }
  }

  public toString(): string {
    return '[EncryptedValue]';
  }

  public toJSON(): object {
    return { type: 'EncryptedValue', encrypted: true };
  }
}
