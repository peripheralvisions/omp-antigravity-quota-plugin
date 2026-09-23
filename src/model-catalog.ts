import type { AccountManager } from "./account-manager.ts";
import type { AntigravityConfig } from "./types.ts";

export interface ModelProfile {
  id: string;
  name: string;
  upstreamModelId: string;
  contextWindow: number;
  maxOutputTokens: number;
  supportsImages: boolean;
  supportsThinking: boolean;
  thinkingLevel?: "minimal" | "low" | "medium" | "high";
  thinkingBudget?: number;
  recommendedReasoningEffort?: string;
  reasoningEfforts?: string[];
  supportsTools: boolean;
}

export const FALLBACK_MODELS: ModelProfile[] = [
  {
    id: "gemini-3.8-flash-high",
    name: "Gemini 3.8 Flash (High)",
    upstreamModelId: "gemini-3.8-flash-tiered",
    contextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    supportsImages: true,
    supportsThinking: true,
    thinkingLevel: "high",
    reasoningEfforts: ["minimal", "low", "medium", "high"],
    supportsTools: true
  },
  {
    id: "gemini-3.8-flash-medium",
    name: "Gemini 3.8 Flash (Medium)",
    upstreamModelId: "gemini-3.8-flash-tiered",
    contextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    supportsImages: true,
    supportsThinking: true,
    thinkingLevel: "medium",
    reasoningEfforts: ["minimal", "low", "medium", "high"],
    supportsTools: true
  },
  {
    id: "gemini-3.8-flash-low",
    name: "Gemini 3.8 Flash (Low)",
    upstreamModelId: "gemini-3.8-flash-tiered",
    contextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    supportsImages: true,
    supportsThinking: true,
    thinkingLevel: "low",
    reasoningEfforts: ["minimal", "low", "medium", "high"],
    supportsTools: true
  },
  {
    id: "gemini-3.8-flash",
    name: "Gemini 3.8 Flash",
    upstreamModelId: "gemini-3.8-flash-tiered",
    contextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    supportsImages: true,
    supportsThinking: true,
    reasoningEfforts: ["minimal", "low", "medium", "high"],
    supportsTools: true
  },
  {
    id: "gemini-3.7-flash-high",
    name: "Gemini 3.7 Flash (High)",
    upstreamModelId: "gemini-3.7-flash-tiered",
    contextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    supportsImages: true,
    supportsThinking: true,
    thinkingLevel: "high",
    reasoningEfforts: ["minimal", "low", "medium", "high"],
    supportsTools: true
  },
  {
    id: "gemini-3.7-flash-medium",
    name: "Gemini 3.7 Flash (Medium)",
    upstreamModelId: "gemini-3.7-flash-tiered",
    contextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    supportsImages: true,
    supportsThinking: true,
    thinkingLevel: "medium",
    reasoningEfforts: ["minimal", "low", "medium", "high"],
    supportsTools: true
  },
  {
    id: "gemini-3.7-flash-low",
    name: "Gemini 3.7 Flash (Low)",
    upstreamModelId: "gemini-3.7-flash-tiered",
    contextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    supportsImages: true,
    supportsThinking: true,
    thinkingLevel: "low",
    reasoningEfforts: ["minimal", "low", "medium", "high"],
    supportsTools: true
  },
  {
    id: "gemini-3.6-flash-high",
    name: "Gemini 3.6 Flash (High)",
    upstreamModelId: "gemini-3.6-flash-tiered",
    contextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    supportsImages: true,
    supportsThinking: true,
    thinkingLevel: "high",
    reasoningEfforts: ["minimal", "low", "medium", "high"],
    supportsTools: true
  },
  {
    id: "gemini-3.6-flash-medium",
    name: "Gemini 3.6 Flash (Medium)",
    upstreamModelId: "gemini-3.6-flash-tiered",
    contextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    supportsImages: true,
    supportsThinking: true,
    thinkingLevel: "medium",
    reasoningEfforts: ["minimal", "low", "medium", "high"],
    supportsTools: true
  },
  {
    id: "gemini-3.6-flash-low",
    name: "Gemini 3.6 Flash (Low)",
    upstreamModelId: "gemini-3.6-flash-tiered",
    contextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    supportsImages: true,
    supportsThinking: true,
    thinkingLevel: "low",
    reasoningEfforts: ["minimal", "low", "medium", "high"],
    supportsTools: true
  },
  {
    id: "gemini-3.1-pro-high",
    name: "Gemini 3.1 Pro (High)",
    upstreamModelId: "gemini-pro-agent",
    contextWindow: 1_048_576,
    maxOutputTokens: 65_535,
    supportsImages: true,
    supportsThinking: true,
    reasoningEfforts: ["low", "high"],
    supportsTools: true
  },
  {
    id: "gemini-3.1-pro-low",
    name: "Gemini 3.1 Pro (Low)",
    upstreamModelId: "gemini-3.1-pro-low",
    contextWindow: 1_048_576,
    maxOutputTokens: 65_535,
    supportsImages: true,
    supportsThinking: true,
    reasoningEfforts: ["low", "high"],
    supportsTools: true
  },
  {
    id: "claude-sonnet-4-6",
    name: "Claude Sonnet 4.6 (Thinking)",
    upstreamModelId: "claude-sonnet-4-6",
    contextWindow: 1_000_000,
    maxOutputTokens: 64_000,
    supportsImages: true,
    supportsThinking: true,
    reasoningEfforts: ["minimal", "low", "medium", "high"],
    supportsTools: true
  },
  {
    id: "claude-opus-4-6-thinking",
    name: "Claude Opus 4.6 (Thinking)",
    upstreamModelId: "claude-opus-4-6-thinking",
    contextWindow: 200_000,
    maxOutputTokens: 64_000,
    supportsImages: true,
    supportsThinking: true,
    reasoningEfforts: ["minimal", "low", "medium", "high"],
    supportsTools: true
  },
  {
    id: "gpt-oss-120b-medium",
    name: "GPT-OSS 120B (Medium)",
    upstreamModelId: "gpt-oss-120b-medium",
    contextWindow: 128_000,
    maxOutputTokens: 40_960,
    supportsImages: false,
    supportsThinking: true,
    reasoningEfforts: ["low", "medium", "high"],
    supportsTools: true
  }
];

export async function fetchRemoteModels(
  accountManager: AccountManager,
  config: AntigravityConfig
): Promise<ModelProfile[]> {
  try {
    const account = await accountManager.getValidAccount();
    const res = await fetch(`${config.endpoint}/v1internal:fetchAvailableModels`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${account.accessToken}`,
        "Content-Type": "application/json",
        "User-Agent": config.userAgent
      },
      body: JSON.stringify({ project: account.projectId })
    });

    if (!res.ok) {
      console.warn(`[Antigravity] Model discovery failed: ${res.status}, falling back to static list`);
      return FALLBACK_MODELS;
    }

    const payload = (await res.json()) as { models?: Record<string, any> };
    if (!payload.models) return FALLBACK_MODELS;

    const list: ModelProfile[] = [];
    const denylist = new Set(["chat_20706", "chat_23310", "tab_flash_lite_preview", "tab_jump_flash_lite_preview"]);

    for (const [key, info] of Object.entries(payload.models)) {
      if (denylist.has(key)) continue;

      if (key === "gemini-3.8-flash-tiered") {
        list.push(
          {
            id: "gemini-3.8-flash-high",
            name: "Gemini 3.8 Flash (High)",
            upstreamModelId: "gemini-3.8-flash-tiered",
            contextWindow: info.maxTokens || 1_048_576,
            maxOutputTokens: info.maxOutputTokens || 65_536,
            supportsImages: info.supportsImages ?? true,
            supportsThinking: true,
            thinkingLevel: "high",
            reasoningEfforts: ["minimal", "low", "medium", "high"],
            supportsTools: true
          },
          {
            id: "gemini-3.8-flash-medium",
            name: "Gemini 3.8 Flash (Medium)",
            upstreamModelId: "gemini-3.8-flash-tiered",
            contextWindow: info.maxTokens || 1_048_576,
            maxOutputTokens: info.maxOutputTokens || 65_536,
            supportsImages: info.supportsImages ?? true,
            supportsThinking: true,
            thinkingLevel: "medium",
            reasoningEfforts: ["minimal", "low", "medium", "high"],
            supportsTools: true
          },
          {
            id: "gemini-3.8-flash-low",
            name: "Gemini 3.8 Flash (Low)",
            upstreamModelId: "gemini-3.8-flash-tiered",
            contextWindow: info.maxTokens || 1_048_576,
            maxOutputTokens: info.maxOutputTokens || 65_536,
            supportsImages: info.supportsImages ?? true,
            supportsThinking: true,
            thinkingLevel: "low",
            reasoningEfforts: ["minimal", "low", "medium", "high"],
            supportsTools: true
          },
          {
            id: "gemini-3.8-flash",
            name: "Gemini 3.8 Flash",
            upstreamModelId: "gemini-3.8-flash-tiered",
            contextWindow: info.maxTokens || 1_048_576,
            maxOutputTokens: info.maxOutputTokens || 65_536,
            supportsImages: info.supportsImages ?? true,
            supportsThinking: true,
            reasoningEfforts: ["minimal", "low", "medium", "high"],
            supportsTools: true
          }
        );
        continue;
      }

      if (key === "gemini-3.7-flash-tiered") {
        list.push(
          {
            id: "gemini-3.7-flash-high",
            name: "Gemini 3.7 Flash (High)",
            upstreamModelId: "gemini-3.7-flash-tiered",
            contextWindow: info.maxTokens || 1_048_576,
            maxOutputTokens: info.maxOutputTokens || 65_536,
            supportsImages: info.supportsImages ?? true,
            supportsThinking: true,
            thinkingLevel: "high",
            reasoningEfforts: ["minimal", "low", "medium", "high"],
            supportsTools: true
          },
          {
            id: "gemini-3.7-flash-medium",
            name: "Gemini 3.7 Flash (Medium)",
            upstreamModelId: "gemini-3.7-flash-tiered",
            contextWindow: info.maxTokens || 1_048_576,
            maxOutputTokens: info.maxOutputTokens || 65_536,
            supportsImages: info.supportsImages ?? true,
            supportsThinking: true,
            thinkingLevel: "medium",
            reasoningEfforts: ["minimal", "low", "medium", "high"],
            supportsTools: true
          },
          {
            id: "gemini-3.7-flash-low",
            name: "Gemini 3.7 Flash (Low)",
            upstreamModelId: "gemini-3.7-flash-tiered",
            contextWindow: info.maxTokens || 1_048_576,
            maxOutputTokens: info.maxOutputTokens || 65_536,
            supportsImages: info.supportsImages ?? true,
            supportsThinking: true,
            thinkingLevel: "low",
            reasoningEfforts: ["minimal", "low", "medium", "high"],
            supportsTools: true
          }
        );
        continue;
      }

      if (key === "gemini-3.6-flash-tiered") {
        list.push(
          {
            id: "gemini-3.6-flash-high",
            name: "Gemini 3.6 Flash (High)",
            upstreamModelId: "gemini-3.6-flash-tiered",
            contextWindow: info.maxTokens || 1_048_576,
            maxOutputTokens: info.maxOutputTokens || 65_536,
            supportsImages: info.supportsImages ?? true,
            supportsThinking: true,
            thinkingLevel: "high",
            reasoningEfforts: ["minimal", "low", "medium", "high"],
            supportsTools: true
          },
          {
            id: "gemini-3.6-flash-medium",
            name: "Gemini 3.6 Flash (Medium)",
            upstreamModelId: "gemini-3.6-flash-tiered",
            contextWindow: info.maxTokens || 1_048_576,
            maxOutputTokens: info.maxOutputTokens || 65_536,
            supportsImages: info.supportsImages ?? true,
            supportsThinking: true,
            thinkingLevel: "medium",
            reasoningEfforts: ["minimal", "low", "medium", "high"],
            supportsTools: true
          },
          {
            id: "gemini-3.6-flash-low",
            name: "Gemini 3.6 Flash (Low)",
            upstreamModelId: "gemini-3.6-flash-tiered",
            contextWindow: info.maxTokens || 1_048_576,
            maxOutputTokens: info.maxOutputTokens || 65_536,
            supportsImages: info.supportsImages ?? true,
            supportsThinking: true,
            thinkingLevel: "low",
            reasoningEfforts: ["minimal", "low", "medium", "high"],
            supportsTools: true
          }
        );
        continue;
      }

      if (key === "gemini-pro-agent" || key === "gemini-3.1-pro-high") {
        list.push({
          id: "gemini-3.1-pro-high",
          name: info.displayName || "Gemini 3.1 Pro (High)",
          upstreamModelId: "gemini-pro-agent",
          contextWindow: info.maxTokens || 1_048_576,
          maxOutputTokens: Math.min(info.maxOutputTokens || 65_535, 65_535),
          supportsImages: info.supportsImages ?? true,
          supportsThinking: true,
          reasoningEfforts: ["low", "high"],
          supportsTools: true
        });
        continue;
      }

      const isClaude = key.startsWith("claude-");
      list.push({
        id: key,
        name: info.displayName || key,
        upstreamModelId: key,
        contextWindow: info.maxTokens || (isClaude ? 200_000 : 1_048_576),
        maxOutputTokens: isClaude ? Math.min(info.maxOutputTokens || 64_000, 64_000) : (info.maxOutputTokens || 65_536),
        supportsImages: info.supportsImages ?? true,
        supportsThinking: info.supportsThinking ?? true,
        reasoningEfforts: ["minimal", "low", "medium", "high"],
        supportsTools: true
      });
    }

    const seen = new Set<string>();
    const deduped: ModelProfile[] = [];
    for (const m of list) {
      if (!seen.has(m.id)) {
        seen.add(m.id);
        deduped.push(m);
      }
    }

    return deduped.length > 0 ? deduped : FALLBACK_MODELS;
  } catch (err) {
    console.error("[Antigravity] Model discovery exception:", err);
    return FALLBACK_MODELS;
  }
}
