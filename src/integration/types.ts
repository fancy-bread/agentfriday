export interface IntegrationConfig {
  name: string;
  displayName: string;
  installSkills(agentsSkillsDir: string): Promise<void>;
  registerMcp(): Promise<{ method: 'cli' | 'file' | 'manual'; snippet?: string }>;
  checkMcpRegistered(): Promise<boolean | 'unknown'>;
}
