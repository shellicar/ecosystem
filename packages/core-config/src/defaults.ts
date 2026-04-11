import type { SecureKeys } from './types';

export const defaultSecureKeys = ['AccessKey', 'SharedAccessKey', 'Password', 'AccountKey', 'Secret', 'SecretKey', 'ApiKey', 'Token', 'Key', 'MasterKey', 'PrimaryKey', 'SecondaryKey'] as const satisfies SecureKeys;
