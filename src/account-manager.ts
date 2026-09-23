import type { AntigravityAccount, AntigravityConfig, PluginSettings } from "./types.ts";
import type { OAuthResult } from "./oauth-manager.ts";
import { resolve9routerDbPaths, resolveOmpAuthPaths, getPluginStorageDir } from "./config.ts";
import { Database } from "bun:sqlite";
import fs from "node:fs";
import path from "node:path";

export type ModelCounterCategory = "Google" | "Anthropic" | "OpenAI";

export function getModelCategory(modelId: string | undefined): ModelCounterCategory {
  if (!modelId) return "Google";
  const lower = modelId.toLowerCase();
  if (lower.startsWith("claude-")) return "Anthropic";
  if (lower.startsWith("gpt-") || lower.startsWith("openai/")) return "OpenAI";
  return "Google";
}

export const DEFAULT_SETTINGS: PluginSettings = {
  strategy: "balanced",
  pollIntervalSec: 60,
  autoRefreshTokens: true,
  rateLimitCooldownSec: 60
};

export class AccountManager {
  private accounts: AntigravityAccount[] = [];
  private config: AntigravityConfig;
  private settings: PluginSettings = { ...DEFAULT_SETTINGS };
  private lastQuotaSyncAt: number = 0;
  private pollerTimer: Timer | null = null;

  constructor(config: AntigravityConfig) {
    this.config = config;
    this.loadSettings();
    this.reloadAccounts();
    this.syncOAuthToOmp();
    this.startBackgroundPoller();
  }

  public getSettings(): PluginSettings {
    return { ...this.settings };
  }

  public updateSettings(partial: Partial<PluginSettings>): PluginSettings {
    this.settings = { ...this.settings, ...partial };
    this.saveSettings();
    if (partial.pollIntervalSec !== undefined) {
      this.startBackgroundPoller();
    }
    return this.settings;
  }

  private getSettingsPath(): string {
    return path.join(this.getAccountsDirectory(), "antigravity-settings.json");
  }

  private loadSettings() {
    const p = this.getSettingsPath();
    if (fs.existsSync(p)) {
      try {
        const saved = JSON.parse(fs.readFileSync(p, "utf-8"));
        this.settings = { ...DEFAULT_SETTINGS, ...saved };
      } catch {}
    }
  }

  private saveSettings() {
    const p = this.getSettingsPath();
    try {
      const dir = path.dirname(p);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(p, JSON.stringify(this.settings, null, 2), "utf-8");
    } catch {}
  }

  private onPeriodicPoll?: () => Promise<void>;

  public setOnPeriodicPoll(fn: () => Promise<void>) {
    this.onPeriodicPoll = fn;
  }

  public startBackgroundPoller() {
    if (this.pollerTimer) {
      clearInterval(this.pollerTimer);
      this.pollerTimer = null;
    }
    const intervalMs = Math.max(15, this.settings.pollIntervalSec) * 1000;
    this.pollerTimer = setInterval(() => {
      this.syncAllQuotas(true).catch(() => {});
      this.onPeriodicPoll?.().catch(() => {});
    }, intervalMs);
    // Ensure timer does not hold short-lived processes (e.g. omp models) open
    if (typeof this.pollerTimer.unref === "function") {
      this.pollerTimer.unref();
    }
  }
  public stopBackgroundPoller() {
    if (this.pollerTimer) {
      clearInterval(this.pollerTimer);
      this.pollerTimer = null;
    }
  }

  public reloadAccounts(): AntigravityAccount[] {
    const list: AntigravityAccount[] = [];
    const seenEmails = new Set<string>();

    // 1. Universally scan any existing 9Router databases
    const dbPaths = resolve9routerDbPaths();
    for (const dbPath of dbPaths) {
      try {
        const db = new Database(dbPath, { readonly: true });
        const rows = db.query(
          "SELECT id, provider, authType, name, email, priority, isActive, data FROM providerConnections WHERE provider = 'antigravity'"
        ).all() as Array<{
          id: string;
          provider: string;
          authType: string;
          name: string;
          email: string;
          priority: number;
          isActive: number;
          data: string;
        }>;

        for (const row of rows) {
          if (!row.isActive) continue;
          try {
            const parsed = JSON.parse(row.data);
            if (!parsed.refreshToken && !parsed.accessToken) continue;
            const email = row.email || row.name || row.id;
            if (seenEmails.has(email)) continue;
            seenEmails.add(email);

            list.push({
              id: row.id,
              email,
              name: row.name || row.email || "Antigravity Account",
              projectId: parsed.projectId || "aicode-consumers",
              accessToken: parsed.accessToken || "",
              refreshToken: parsed.refreshToken || "",
              expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt).getTime() : 0,
              priority: row.priority ?? 1,
              isActive: true,
              lastUsedAt: parsed.lastUsedAt,
              consecutiveUseCount: parsed.consecutiveUseCount || 0,
              rateLimitedUntil: null
            });
          } catch {}
        }
        db.close();
      } catch (err) {
        console.warn(`[Antigravity] Notice reading ${dbPath}:`, (err as Error).message);
      }
    }

    // 2. Universally load from plugin local storage
    const localStorePath = this.getLocalAccountsPath();
    if (fs.existsSync(localStorePath)) {
      try {
        const stored = JSON.parse(fs.readFileSync(localStorePath, "utf-8")) as AntigravityAccount[];
        for (const item of stored) {
          if (!seenEmails.has(item.email)) {
            seenEmails.add(item.email);
            list.push(item);
          }
        }
      } catch {}
    }

    // 3. Universally scan any omp / pi auth.json files
    const authPaths = resolveOmpAuthPaths();
    for (const authPath of authPaths) {
      try {
        const authData = JSON.parse(fs.readFileSync(authPath, "utf-8"));
        const agEntry = authData["google-antigravity"];
        if (agEntry && (agEntry.refreshToken || agEntry.token)) {
          const email = agEntry.email || "omp-oauth-user";
          if (!seenEmails.has(email)) {
            seenEmails.add(email);
            list.push({
              id: "omp-" + email,
              email,
              name: agEntry.name || email,
              projectId: agEntry.projectId || "aicode-consumers",
              accessToken: agEntry.token || "",
              refreshToken: agEntry.refreshToken || "",
              expiresAt: agEntry.expiresAt ? new Date(agEntry.expiresAt).getTime() : 0,
              priority: 0,
              isActive: true
            });
          }
        }
      } catch {}
    }

    this.accounts = list.sort((a, b) => a.priority - b.priority);
    return this.accounts;
  }

  public getAccounts(): AntigravityAccount[] {
    return this.accounts;
  }

  public saveAccount(oauth: OAuthResult) {
    this.importAccounts([
      {
        email: oauth.email,
        name: oauth.name,
        projectId: oauth.projectId,
        accessToken: oauth.accessToken,
        refreshToken: oauth.refreshToken,
        expiresIn: oauth.expiresIn
      }
    ]);
  }

  /**
   * Import multiple accounts from JSON string, object, or file path.
   * Accepts arrays or objects with refreshToken or accessToken.
   */
  public importAccounts(
    rawInput: string | Array<Record<string, unknown>> | Record<string, unknown>
  ): { imported: number; total: number; errors: string[] } {
    const errors: string[] = [];
    let items: Array<Record<string, unknown>> = [];

    if (typeof rawInput === "string") {
      const trimmed = rawInput.trim();
      if (fs.existsSync(trimmed)) {
        try {
          const content = fs.readFileSync(trimmed, "utf-8");
          const parsed = JSON.parse(content);
          items = Array.isArray(parsed) ? parsed : [parsed];
        } catch (err) {
          return { imported: 0, total: this.accounts.length, errors: [`Failed to read file: ${(err as Error).message}`] };
        }
      } else {
        try {
          const parsed = JSON.parse(trimmed);
          items = Array.isArray(parsed) ? parsed : [parsed];
        } catch {
          const lines = trimmed.split(/[\r\n,]+/).map(s => s.trim()).filter(Boolean);
          for (const line of lines) {
            if (line.startsWith("1//") || line.startsWith("ya29.") || line.length > 20) {
              items.push({ refreshToken: line });
            }
          }
        }
      }
    } else if (Array.isArray(rawInput)) {
      items = rawInput;
    } else if (typeof rawInput === "object" && rawInput !== null) {
      items = [rawInput];
    }

    if (items.length === 0) {
      return { imported: 0, total: this.accounts.length, errors: ["No accounts found in input."] };
    }

    const localStorePath = this.getLocalAccountsPath();
    let existingList: AntigravityAccount[] = [];
    if (fs.existsSync(localStorePath)) {
      try {
        existingList = JSON.parse(fs.readFileSync(localStorePath, "utf-8"));
      } catch {}
    }

    let importedCount = 0;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const refreshToken = (item.refreshToken || item.refresh_token || item.token || "") as string;
      const accessToken = (item.accessToken || item.access_token || "") as string;
      const email = (item.email || item.user || `account-${Date.now()}-${i}@antigravity`) as string;
      const projectId = (item.projectId || item.project || "aicode-consumers") as string;
      const name = (item.name || email) as string;
      const expiresIn = typeof item.expiresIn === "number" ? item.expiresIn : 3600;

      if (!refreshToken && !accessToken) {
        errors.push(`Item #${i + 1} (${email}): missing refreshToken or accessToken.`);
        continue;
      }

      const id = "ag-" + Buffer.from(email + i).toString("hex").slice(0, 12);
      const newAcc: AntigravityAccount = {
        id,
        email,
        name,
        projectId,
        accessToken,
        refreshToken,
        expiresAt: Date.now() + expiresIn * 1000,
        priority: typeof item.priority === "number" ? item.priority : 1,
        isActive: true
      };

      existingList = existingList.filter(a => a.email !== email);
      existingList.push(newAcc);
      importedCount++;
    }

    const dir = path.dirname(localStorePath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(localStorePath, JSON.stringify(existingList, null, 2), "utf-8");

    this.reloadAccounts();
    return { imported: importedCount, total: this.accounts.length, errors };
  }

  private getAccountsDirectory(): string {
    if (this.config.authJsonPath) {
      return path.dirname(this.config.authJsonPath);
    }
    return getPluginStorageDir();
  }

  private getLocalAccountsPath(): string {
    return path.join(this.getAccountsDirectory(), "antigravity-accounts.json");
  }

  public async syncAllQuotas(force: boolean = false) {
    const now = Date.now();
    if (!force && now - this.lastQuotaSyncAt < 30_000) {
      return;
    }
    this.lastQuotaSyncAt = now;

    for (const account of this.accounts) {
      try {
        if (!account.accessToken || (typeof account.expiresAt === "number" && account.expiresAt - now < this.config.tokenRefreshSkewMs)) {
          await this.refreshAccountToken(account);
        }

        const res = await fetch(`${this.config.endpoint}/v1internal:retrieveUserQuota`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${account.accessToken}`,
            "Content-Type": "application/json",
            "User-Agent": this.config.userAgent
          },
          body: JSON.stringify({ project: account.projectId })
        });

        if (res.ok) {
          const data = (await res.json()) as {
            buckets?: Array<{
              modelId: string;
              remainingFraction?: number;
              resetTime?: string;
            }>;
          };

          if (data.buckets && Array.isArray(data.buckets)) {
            let geminiBucket: { remainingFraction: number; resetTime?: string } | undefined;
            let claudeBucket: { remainingFraction: number; resetTime?: string } | undefined;
            let openaiBucket: { remainingFraction: number; resetTime?: string } | undefined;

            for (const b of data.buckets) {
              if (b.remainingFraction === undefined) continue;
              if (b.modelId === "gemini-3.8-flash-tiered" || b.modelId === "gemini-3-flash") {
                geminiBucket = { remainingFraction: b.remainingFraction, resetTime: b.resetTime };
              }
              if (b.modelId === "claude-sonnet-4-6" || b.modelId === "claude-opus-4-6-thinking") {
                claudeBucket = { remainingFraction: b.remainingFraction, resetTime: b.resetTime };
              }
              if (b.modelId === "gpt-oss-120b-medium") {
                openaiBucket = { remainingFraction: b.remainingFraction, resetTime: b.resetTime };
              }
            }

            account.quota = {
              gemini: geminiBucket
                ? {
                    remainingFraction: geminiBucket.remainingFraction,
                    resetTime: geminiBucket.resetTime,
                    resetSecondsRemaining: geminiBucket.resetTime
                      ? Math.max(0, Math.floor((new Date(geminiBucket.resetTime).getTime() - now) / 1000))
                      : undefined
                  }
                : account.quota?.gemini,
              claude: claudeBucket
                ? {
                    remainingFraction: claudeBucket.remainingFraction,
                    resetTime: claudeBucket.resetTime,
                    resetSecondsRemaining: claudeBucket.resetTime
                      ? Math.max(0, Math.floor((new Date(claudeBucket.resetTime).getTime() - now) / 1000))
                      : undefined
                  }
                : account.quota?.claude,
              openai: openaiBucket
                ? {
                    remainingFraction: openaiBucket.remainingFraction,
                    resetTime: openaiBucket.resetTime,
                    resetSecondsRemaining: openaiBucket.resetTime
                      ? Math.max(0, Math.floor((new Date(openaiBucket.resetTime).getTime() - now) / 1000))
                      : undefined
                  }
                : account.quota?.openai
            };
          }
        }
      } catch (err) {
        console.warn(`[Antigravity] Failed to fetch quota for ${account.email}:`, err);
      }
    }
  }

  public async getValidAccount(modelId?: string): Promise<AntigravityAccount> {
    if (this.accounts.length === 0) {
      this.reloadAccounts();
      if (this.accounts.length === 0) {
        throw new Error("No active Antigravity accounts found. Run /ag login to authenticate a new account or /ag import to bulk import.");
      }
    }

    const now = Date.now();

    if (now - this.lastQuotaSyncAt > this.settings.pollIntervalSec * 1000) {
      this.syncAllQuotas().catch(() => {});
    }

    const available = this.accounts.filter(a => !a.rateLimitedUntil || a.rateLimitedUntil <= now);
    const pool = available.length > 0 ? available : this.accounts;

    const category = getModelCategory(modelId);

    const scored = pool.map(acc => {
      let quotaScore = 1.0;
      let resetSeconds = 18000;
      if (acc.quota) {
        if (category === "Anthropic" && acc.quota.claude) {
          quotaScore = acc.quota.claude.remainingFraction;
          resetSeconds = acc.quota.claude.resetSecondsRemaining ?? resetSeconds;
        } else if (category === "Google" && acc.quota.gemini) {
          quotaScore = acc.quota.gemini.remainingFraction;
          resetSeconds = acc.quota.gemini.resetSecondsRemaining ?? resetSeconds;
        } else if (category === "OpenAI" && acc.quota.openai) {
          quotaScore = acc.quota.openai.remainingFraction;
          resetSeconds = acc.quota.openai.resetSecondsRemaining ?? resetSeconds;
        }
      }

      const lastUsed = acc.lastUsedAt ? new Date(acc.lastUsedAt).getTime() : 0;
      const consecutive = acc.consecutiveUseCount || 0;

      return { acc, quotaScore, resetSeconds, lastUsed, consecutive };
    });

    const strategy = this.settings.strategy;

    if (strategy === "quota-greedy") {
      scored.sort((a, b) => b.quotaScore - a.quotaScore);
    } else if (strategy === "lru") {
      scored.sort((a, b) => a.lastUsed - b.lastUsed);
    } else if (strategy === "sticky") {
      const current = scored.find(s => s.consecutive > 0 && s.quotaScore > 0.1);
      if (current) {
        return current.acc;
      }
      scored.sort((a, b) => b.quotaScore - a.quotaScore);
    } else {
      scored.sort((a, b) => {
        const aHealthy = a.quotaScore > 0.05;
        const bHealthy = b.quotaScore > 0.05;
        if (aHealthy !== bHealthy) return aHealthy ? -1 : 1;

        if (Math.abs(a.quotaScore - b.quotaScore) > 0.05) {
          return b.quotaScore - a.quotaScore;
        }

        if (a.consecutive !== b.consecutive) {
          return a.consecutive - b.consecutive;
        }

        return a.lastUsed - b.lastUsed;
      });
    }

    const chosen = scored[0].acc;

    if (
      !chosen.accessToken ||
      typeof chosen.expiresAt !== "number" ||
      chosen.expiresAt - now < this.config.tokenRefreshSkewMs
    ) {
      await this.refreshAccountToken(chosen);
    }

    chosen.lastUsedAt = new Date().toISOString();
    chosen.consecutiveUseCount = (chosen.consecutiveUseCount || 0) + 1;

    for (const a of this.accounts) {
      if (a.id !== chosen.id) {
        a.consecutiveUseCount = 0;
      }
    }

    return chosen;
  }

  public markRateLimited(accountId: string) {
    const acc = this.accounts.find(a => a.id === accountId);
    if (acc) {
      acc.rateLimitedUntil = Date.now() + this.settings.rateLimitCooldownSec * 1000;
      acc.errorCount = (acc.errorCount || 0) + 1;
      acc.consecutiveUseCount = 0;
    }
  }

  public async refreshAccountToken(account: AntigravityAccount): Promise<string> {
    if (!account.refreshToken) {
      throw new Error(`Account ${account.email} has no refresh token.`);
    }

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: account.refreshToken,
      grant_type: "refresh_token"
    });

    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString()
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to refresh token for ${account.email}: ${res.status} ${errText}`);
    }

    const data = (await res.json()) as { access_token: string; expires_in: number };
    account.accessToken = data.access_token;
    account.expiresAt = Date.now() + data.expires_in * 1000;
    this.syncOAuthToOmp(account);
    return data.access_token;
  }

  public syncOAuthToOmp(acc?: AntigravityAccount) {
    const target = acc || this.accounts.find(a => a.isActive && !a.rateLimitedUntil) || this.accounts[0];
    if (!target || !target.accessToken) return;

    try {
      const dataPayload = JSON.stringify({
        access: target.accessToken,
        refresh: target.refreshToken || "",
        expires: typeof target.expiresAt === "number" ? target.expiresAt : Date.now() + 3600 * 1000,
        projectId: target.projectId || "aicode-consumers",
        email: target.email
      });

      // 1. Sync to agent.db auth_credentials table
      const agentDbPath = path.join(os.homedir(), ".omp", "agent", "agent.db");
      if (fs.existsSync(agentDbPath)) {
        try {
          const db = new Database(agentDbPath);
          const now = Math.floor(Date.now() / 1000);
          const existing = db.query("SELECT id FROM auth_credentials WHERE provider = 'google-antigravity'").get() as { id: number } | null;
          if (existing) {
            db.run("UPDATE auth_credentials SET data = ?, updated_at = ? WHERE provider = 'google-antigravity'", [dataPayload, now]);
          } else {
            db.run(
              "INSERT INTO auth_credentials (provider, credential_type, data, created_at, updated_at) VALUES ('google-antigravity', 'oauth', ?, ?, ?)",
              [dataPayload, now, now]
            );
          }
        } catch {}
      }

      // 2. Sync to auth.json in ~/.omp/agent/auth.json and ~/.pi/agent/auth.json
      for (const authPath of [
        path.join(os.homedir(), ".omp", "agent", "auth.json"),
        path.join(os.homedir(), ".pi", "agent", "auth.json")
      ]) {
        try {
          const dir = path.dirname(authPath);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          let obj: Record<string, unknown> = {};
          if (fs.existsSync(authPath)) {
            try {
              obj = JSON.parse(fs.readFileSync(authPath, "utf-8"));
            } catch {}
          }
          obj["google-antigravity"] = {
            type: "oauth",
            access: target.accessToken,
            refresh: target.refreshToken || "",
            expires: target.expiresAt,
            projectId: target.projectId || "aicode-consumers",
            email: target.email
          };
          fs.writeFileSync(authPath, JSON.stringify(obj, null, 2), "utf-8");
        } catch {}
      }
    } catch {}
  }
}
