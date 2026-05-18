export type { MemoryVault } from './vault/MemoryVault.js';
export type { KeyManager, KeyManagerWithMeta, KeyManagerBackend, StorageType } from './keys/KeyManager.js';
export type { EntryId, EntryAction, MemoryEntryDecrypted, QueryOptions } from './vault/types.js';
export { SoftwareKeyManager } from './keys/SoftwareKeyManager.js';
export { KeychainKeyManager } from './keys/KeychainKeyManager.js';
export { resolveBackend } from './keys/platform.js';
export { SqliteVault } from './vault/SqliteVault.js';
export type { SqliteVaultOptions, Embedder } from './vault/SqliteVault.js';
