export interface AccountQuotaInfo {
  remainingFraction: number;
  resetTime?: string;
  resetSecondsRemaining?: number;
}

export interface AntigravityAccount {
  id: string;
  email: string;
  name: string;
  projectId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: string | number;
  priority: number;
  isActive: boolean;
  lastUsedAt?: string;
  consecutiveUseCount?: number;
  errorCount?: number;
  rateLimitedUntil?: number | null;
  quota?: {
    gemini?: AccountQuotaInfo;
    claude?: AccountQuotaInfo;
    openai?: AccountQuotaInfo;
  };
}

export interface UpstreamModelQuota {
  remainingFraction?: number;
  resetTime?: string;
}

export interface UpstreamModelInfo {
  displayName?: string;
  supportsImages?: boolean;
  supportsThinking?: boolean;
  thinkingBudget?: number;
  minThinkingBudget?: number;
  recommended?: boolean;
  maxTokens?: number;
  maxOutputTokens?: number;
  quotaInfo?: UpstreamModelQuota;
  model?: string;
  apiProvider?: string;
}

export interface UpstreamModelsResponse {
  models: Record<string, UpstreamModelInfo>;
}

export type RoutingStrategy = "balanced" | "lru" | "quota-greedy" | "sticky";

export interface PluginSettings {
  strategy: RoutingStrategy;
  pollIntervalSec: number;
  autoRefreshTokens: boolean;
  rateLimitCooldownSec: number;
}

export interface AntigravityConfig {
  endpoint: string;
  sandboxEndpoint: string;
  clientId: string;
  clientSecret: string;
  userAgent: string;
  dbPath?: string;
  authJsonPath?: string;
  tokenRefreshSkewMs: number;
}
