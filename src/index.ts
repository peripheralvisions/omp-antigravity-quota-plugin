import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";
import type { ThinkingConfig } from "@oh-my-pi/pi-catalog/types";
import type { RoutingStrategy } from "./types.ts";
import { DEFAULT_CONFIG } from "./config.ts";
import { AccountManager } from "./account-manager.ts";
import { fetchRemoteModels, FALLBACK_MODELS, type ModelProfile } from "./model-catalog.ts";
import { ProxyServer } from "./proxy-server.ts";
import { OAuthManager } from "./oauth-manager.ts";

function mapThinkingConfig(m: ModelProfile): ThinkingConfig | undefined {
  if (!m.supportsThinking) return undefined;
  const efforts = (m.reasoningEfforts || ["minimal", "low", "medium", "high"]) as ThinkingConfig["efforts"];
  return {
    mode: "effort",
    efforts,
    defaultLevel: (m.thinkingLevel || "low") as ThinkingConfig["defaultLevel"]
  };
}

function formatCountdown(targetIsoDate?: string): string {
  if (!targetIsoDate) return "N/A";
  const diff = new Date(targetIsoDate).getTime() - Date.now();
  if (diff <= 0) return "Ready";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const secs = Math.floor((diff % (1000 * 60)) / 1000);
  return `${hours}h ${mins}m ${secs}s`;
}

function createProgressBar(percent: number, width: number = 10): string {
  const clamped = Math.max(0, Math.min(100, percent));
  const filled = Math.round((clamped / 100) * width);
  return "█".repeat(filled) + "░".repeat(width - filled);
}

function isRoutingStrategy(val: string): val is RoutingStrategy {
  return val === "balanced" || val === "lru" || val === "quota-greedy" || val === "sticky";
}

export default async function antigravityPlugin(pi: ExtensionAPI) {
  const accountManager = new AccountManager(DEFAULT_CONFIG);
  const oauthManager = new OAuthManager(DEFAULT_CONFIG.clientId, DEFAULT_CONFIG.clientSecret);
  const accounts = accountManager.getAccounts();

  console.log(`[Antigravity Plugin] Initialized with ${accounts.length} account(s).`);

  // Start internal proxy server
  const proxy = new ProxyServer(accountManager, DEFAULT_CONFIG, 20129);
  proxy.start();

  // Initial models setup
  let currentModels: ModelProfile[] = FALLBACK_MODELS;
  try {
    currentModels = await fetchRemoteModels(accountManager, DEFAULT_CONFIG);
    proxy.setModels(currentModels);
  } catch (err) {
    console.warn("[Antigravity Plugin] Failed to fetch remote models during load, using fallback catalog.", err);
  }

  // Register provider into oh-my-pi's model registry
  pi.registerProvider("antigravity", {
    baseUrl: proxy.getBaseUrl(),
    api: "openai-completions",
    apiKey: "antigravity-internal-key",
    authHeader: true,
    models: currentModels.map(m => ({
      id: m.id,
      name: m.name,
      contextWindow: m.contextWindow,
      maxTokens: m.maxOutputTokens,
      reasoning: m.supportsThinking,
      input: m.supportsImages ? ["text", "image"] : ["text"],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      thinking: mapThinkingConfig(m)
    })),
    fetchDynamicModels: async () => {
      try {
        const fresh = await fetchRemoteModels(accountManager, DEFAULT_CONFIG);
        proxy.setModels(fresh);
        return fresh.map(m => ({
          id: m.id,
          name: m.name,
          contextWindow: m.contextWindow,
          maxTokens: m.maxOutputTokens,
          reasoning: m.supportsThinking,
          input: m.supportsImages ? ["text", "image"] : ["text"],
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
          thinking: mapThinkingConfig(m)
        }));
      } catch (err) {
        console.error("[Antigravity Plugin] Error refreshing dynamic models:", err);
        return currentModels.map(m => ({
          id: m.id,
          name: m.name,
          contextWindow: m.contextWindow,
          maxTokens: m.maxOutputTokens,
          reasoning: m.supportsThinking,
          input: m.supportsImages ? ["text", "image"] : ["text"],
          cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 }
        }));
      }
    }
  });

  // Slash commands for management, usage, settings, bulk import, and quotas
  pi.registerCommand("ag", {
    description: "Manage Antigravity accounts, bulk import, view 5h pool quotas, settings, and login",
    handler: async (args, ctx) => {
      const parts = args.trim().split(/\s+/);
      const sub = parts[0]?.toLowerCase() || "";

      if (sub === "login" || sub === "add") {
        ctx.ui.notify("Starting Google OAuth login in browser on port 51121...", "info");
        try {
          const result = await oauthManager.loginInteractive(51121);
          accountManager.saveAccount(result);
          ctx.ui.notify(`Successfully added account: ${result.email}! Total accounts: ${accountManager.getAccounts().length}`, "info");
        } catch (err) {
          ctx.ui.notify(`Login failed: ${(err as Error).message}`, "error");
        }
        return;
      }

      if (sub === "import") {
        const payload = args.slice(parts[0].length).trim();
        if (!payload) {
          ctx.ui.notify(
            "Usage: /ag import <file-path | json-string | comma-separated-tokens>\n" +
            "Examples:\n" +
            "  /ag import ./accounts.json\n" +
            '  /ag import [{"email":"user@gmail.com","refreshToken":"1//..."}]\n' +
            "  /ag import 1//token1, 1//token2",
            "info"
          );
          return;
        }

        const res = accountManager.importAccounts(payload);
        if (res.imported > 0) {
          ctx.ui.notify(`Successfully imported ${res.imported} account(s)! Active pool: ${res.total}`, "info");
          accountManager.syncAllQuotas(true).catch(() => {});
        } else {
          ctx.ui.notify(`Import failed: ${res.errors.join("; ")}`, "error");
        }
        return;
      }

      if (sub === "usage" || sub === "quota") {
        await accountManager.syncAllQuotas(true);
        const list = accountManager.getAccounts();
        const lines: string[] = ["=== Antigravity 5-Hour Quota Pools ==="];

        for (let i = 0; i < list.length; i++) {
          const a = list[i];
          const gFrac = (a.quota?.gemini?.remainingFraction ?? 1) * 100;
          const cFrac = (a.quota?.claude?.remainingFraction ?? 1) * 100;
          const oFrac = (a.quota?.openai?.remainingFraction ?? 1) * 100;

          const gReset = formatCountdown(a.quota?.gemini?.resetTime);
          const cReset = formatCountdown(a.quota?.claude?.resetTime);

          lines.push(
            `\n[#${i + 1}] ${a.email} (${a.projectId})`,
            `  • Gemini  [${createProgressBar(gFrac)}] ${gFrac.toFixed(1)}% | Reset: ${gReset}`,
            `  • Claude  [${createProgressBar(cFrac)}] ${cFrac.toFixed(1)}% | Reset: ${cReset}`,
            `  • GPT-OSS [${createProgressBar(oFrac)}] ${oFrac.toFixed(1)}%`
          );
        }

        ctx.ui.notify(lines.join("\n"), "info");
        return;
      }

      if (sub === "settings" || sub === "config") {
        const key = parts[1]?.toLowerCase();
        const val = parts[2]?.toLowerCase();

        if (key === "strategy" && val) {
          if (isRoutingStrategy(val)) {
            accountManager.updateSettings({ strategy: val });
            ctx.ui.notify(`Updated routing strategy to: ${val}`, "info");
          } else {
            ctx.ui.notify("Valid strategies: balanced | lru | quota-greedy | sticky", "error");
          }
          return;
        }

        if (key === "poll" && val) {
          const sec = parseInt(val, 10);
          if (sec >= 15) {
            accountManager.updateSettings({ pollIntervalSec: sec });
            ctx.ui.notify(`Updated background poll interval to ${sec}s`, "info");
          } else {
            ctx.ui.notify("Minimum poll interval is 15 seconds.", "error");
          }
          return;
        }

        const s = accountManager.getSettings();
        ctx.ui.notify(
          `Antigravity Settings:\n` +
          `  • strategy: ${s.strategy} (balanced | lru | quota-greedy | sticky)\n` +
          `  • pollIntervalSec: ${s.pollIntervalSec}s\n` +
          `  • autoRefreshTokens: ${s.autoRefreshTokens}\n` +
          `  • rateLimitCooldownSec: ${s.rateLimitCooldownSec}s\n\n` +
          `Usage: /ag settings strategy <name> | /ag settings poll <seconds>`,
          "info"
        );
        return;
      }

      if (sub === "reload" || sub === "refresh") {
        accountManager.reloadAccounts();
        await accountManager.syncAllQuotas(true);
        const fresh = await fetchRemoteModels(accountManager, DEFAULT_CONFIG);
        proxy.setModels(fresh);
        ctx.ui.notify(`Reloaded ${accountManager.getAccounts().length} accounts and ${fresh.length} models.`, "info");
        return;
      }

      if (sub === "test") {
        try {
          const acc = await accountManager.getValidAccount();
          ctx.ui.notify(`Testing token refresh on account: ${acc.email}...`, "info");
          await accountManager.refreshAccountToken(acc);
          ctx.ui.notify(`Token verified successfully for ${acc.email}!`, "info");
        } catch (err) {
          ctx.ui.notify(`Test failed: ${(err as Error).message}`, "error");
        }
        return;
      }

      // Default overview
      const list = accountManager.getAccounts();
      const settings = accountManager.getSettings();
      const rows = list.map((a, i) => {
        const qG = a.quota?.gemini ? `${(a.quota.gemini.remainingFraction * 100).toFixed(1)}%` : "N/A";
        const qC = a.quota?.claude ? `${(a.quota.claude.remainingFraction * 100).toFixed(1)}%` : "N/A";
        return `#${i + 1} ${a.email} | Gemini: ${qG} | Claude: ${qC} | Priority: ${a.priority}`;
      });

      ctx.ui.notify(
        `Antigravity Multi-Account Overview (${list.length} accounts, strategy: ${settings.strategy}):\n` +
        `${rows.join("\n")}\n\n` +
        `Subcommands:\n` +
        `  /ag usage       - Detailed 5h pool reset countdowns & progress bars\n` +
        `  /ag import      - Bulk import accounts (file, JSON, or tokens)\n` +
        `  /ag settings    - Change routing strategy (balanced/lru/quota-greedy/sticky)\n` +
        `  /ag login       - Add a single Google account via OAuth\n` +
        `  /ag test        - Test token validity & refresh\n` +
        `  /ag reload      - Force refresh accounts, quotas, & model catalog`,
        "info"
      );
    }
  });

  pi.on("session_start", async (_event, ctx) => {
    ctx.ui.notify(`Antigravity multi-account proxy active (${accounts.length} accounts available).`, "info");
  });
}
