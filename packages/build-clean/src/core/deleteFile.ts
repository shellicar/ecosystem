import { unlink } from 'node:fs/promises';
import type { ILogger } from '../types';

export async function deleteFile(filePath: string, logger: ILogger): Promise<void> {
  try {
    await unlink(filePath);
  } catch (error) {
    logger.warn(`Failed to delete "${filePath}":`, error);
  }
}
