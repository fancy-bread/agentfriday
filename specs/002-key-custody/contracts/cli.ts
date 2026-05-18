/**
 * CLI command contracts for key custody.
 *
 * init   — first-time vault setup
 * status — health check and identity verification
 *
 * Both commands are invoked via the `agent-friday` CLI entry point.
 * Exit codes: 0 = success, 1 = user error (with human-readable message).
 */

export interface InitOptions {
  /** Absolute path override for vault database location. Default: ~/.agent-friday/vault.db */
  vaultPath?: string;
}

export interface InitResult {
  fingerprint: string;   // colon-separated hex, e.g. "ab:cd:ef:..."
  storageType: 'keychain' | 'software';
  vaultPath: string;
}

export interface StatusResult {
  fingerprint: string;
  storageType: 'keychain' | 'software';
  vaultPath: string;
  keyAccessible: boolean;
  chainIntact: boolean;  // false if vault.db missing; true if vault is intact
}

/**
 * Execute `init`. Returns InitResult on success; throws on failure.
 *
 * Stdout on success:
 *   Agent Friday initialised.
 *   Public key: ab:cd:ef:...
 *   Storage:    Keychain (software-protected)
 *   Vault:      /Users/<user>/.agent-friday/vault.db
 *
 *   WARNING: If this key is lost, your memories cannot be recovered.
 *
 * Stderr + exit 1 if key already exists:
 *   Error: vault already initialised. Run `agent-friday status` to verify.
 */
export declare function runInit(options?: InitOptions): Promise<InitResult>;

/**
 * Execute `status`. Returns StatusResult on success; throws on failure.
 *
 * Stdout:
 *   Agent Friday
 *   ────────────────────────────────
 *   Key          ab:cd:ef:...
 *   Key storage  Keychain (software-protected)
 *   Vault        /Users/<user>/.agent-friday/vault.db
 *   Chain        ✓ intact
 *
 * Exit 1 if key is missing or inaccessible.
 */
export declare function runStatus(): Promise<StatusResult>;
