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
  // Gemini 3.8 Flash
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

  // Gemini 3.7 Flash
  {
    id: "gemini-3.7-flash",
    name: "Gemini 3.7 Flash",
    upstreamModelId: "gemini-3.7-flash-tiered",
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

  // Gemini 3.6 Flash
  {
    id: "gemini-3.6-flash",
    name: "Gemini 3.6 Flash",
    upstreamModelId: "gemini-3.6-flash-tiered",
    contextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    supportsImages: true,
    supportsThinking: true,
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

  // Gemini 3.5 Flash
  {
    id: "gemini-3.5-flash",
    name: "Gemini 3.5 Flash",
    upstreamModelId: "gemini-3-flash-agent",
    contextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    supportsImages: true,
    supportsThinking: true,
    reasoningEfforts: ["minimal", "low", "medium", "high"],
    supportsTools: true
  },
  {
    id: "gemini-3.5-flash-high",
    name: "Gemini 3.5 Flash (High)",
    upstreamModelId: "gemini-3-flash-agent",
    contextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    supportsImages: true,
    supportsThinking: true,
    thinkingLevel: "high",
    reasoningEfforts: ["minimal", "low", "medium", "high"],
    supportsTools: true
  },
  {
    id: "gemini-3.5-flash-medium",
    name: "Gemini 3.5 Flash (Medium)",
    upstreamModelId: "gemini-3.5-flash-low",
    contextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    supportsImages: true,
    supportsThinking: true,
    thinkingLevel: "medium",
    reasoningEfforts: ["minimal", "low", "medium", "high"],
    supportsTools: true
  },
  {
    id: "gemini-3.5-flash-low",
    name: "Gemini 3.5 Flash (Low)",
    upstreamModelId: "gemini-3.5-flash-extra-low",
    contextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    supportsImages: true,
    supportsThinking: true,
    thinkingLevel: "low",
    reasoningEfforts: ["minimal", "low", "medium", "high"],
    supportsTools: true
  },

  // Gemini 3.1 Pro
  {
    id: "gemini-3.1-pro",
    name: "Gemini 3.1 Pro",
    upstreamModelId: "gemini-pro-agent",
    contextWindow: 1_048_576,
    maxOutputTokens: 65_535,
    supportsImages: true,
    supportsThinking: true,
    reasoningEfforts: ["low", "high"],
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
    thinkingLevel: "high",
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
    thinkingLevel: "low",
    reasoningEfforts: ["low", "high"],
    supportsTools: true
  },
  {
    id: "gemini-pro-agent",
    name: "Gemini Pro Agent",
    upstreamModelId: "gemini-pro-agent",
    contextWindow: 1_048_576,
    maxOutputTokens: 65_535,
    supportsImages: true,
    supportsThinking: true,
    thinkingLevel: "high",
    reasoningEfforts: ["low", "high"],
    supportsTools: true
  },

  // Gemini 3 Flash
  {
    id: "gemini-3-flash",
    name: "Gemini 3 Flash",
    upstreamModelId: "gemini-3-flash",
    contextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    supportsImages: true,
    supportsThinking: true,
    reasoningEfforts: ["minimal", "low", "medium", "high"],
    supportsTools: true
  },

  // Anthropic Claude
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
    id: "claude-opus-4-6",
    name: "Claude Opus 4.6",
    upstreamModelId: "claude-opus-4-6-thinking",
    contextWindow: 200_000,
    maxOutputTokens: 64_000,
    supportsImages: true,
    supportsThinking: true,
    reasoningEfforts: ["minimal", "low", "medium", "high"],
    supportsTools: true
  },

  // OpenAI GPT-OSS
  {
    id: "gpt-oss-120b",
    name: "GPT-OSS 120B",
    upstreamModelId: "gpt-oss-120b-medium",
    contextWindow: 128_000,
    maxOutputTokens: 32_768,
    supportsImages: false,
    supportsThinking: true,
    reasoningEfforts: ["low", "medium", "high"],
    supportsTools: true
  },
  {
    id: "gpt-oss-120b-medium",
    name: "GPT-OSS 120B (Medium)",
    upstreamModelId: "gpt-oss-120b-medium",
    contextWindow: 128_000,
    maxOutputTokens: 32_768,
    supportsImages: false,
    supportsThinking: true,
    reasoningEfforts: ["low", "medium", "high"],
    supportsTools: true
  },

  // Flash Lite & Utilities
  {
    id: "gemini-3.1-flash-lite",
    name: "Gemini 3.1 Flash Lite",
    upstreamModelId: "gemini-3.1-flash-lite",
    contextWindow: 1_048_576,
    maxOutputTokens: 65_535,
    supportsImages: true,
    supportsThinking: true,
    reasoningEfforts: ["minimal", "low", "medium", "high"],
    supportsTools: true
  },
  {
    id: "gemini-3.5-flash-lite",
    name: "Gemini 3.5 Flash Lite",
    upstreamModelId: "gemini-3.5-flash-lite",
    contextWindow: 1_048_576,
    maxOutputTokens: 65_535,
    supportsImages: true,
    supportsThinking: true,
    reasoningEfforts: ["minimal", "low", "medium", "high"],
    supportsTools: true
  },
  {
    id: "gemini-3.1-flash-image",
    name: "Gemini 3.1 Flash Image",
    upstreamModelId: "gemini-3.1-flash-image",
    contextWindow: 1_048_576,
    maxOutputTokens: 65_536,
    supportsImages: true,
    supportsThinking: false,
    supportsTools: false
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    upstreamModelId: "gemini-2.5-pro",
    contextWindow: 1_048_576,
    maxOutputTokens: 65_535,
    supportsImages: true,
    supportsThinking: true,
    reasoningEfforts: ["minimal", "low", "medium", "high"],
    supportsTools: true
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    upstreamModelId: "gemini-2.5-flash",
    contextWindow: 1_048_576,
    maxOutputTokens: 65_535,
    supportsImages: true,
    supportsThinking: true,
    reasoningEfforts: ["minimal", "low", "medium", "high"],
    supportsTools: true
  }
];

/**
 * Dynamically synthesizes canonical base models and specific reasoning variants
 * from raw models returned by Google Antigravity discovery endpoint.
 *
 * Automatically handles ANY newly released Flash generation (e.g. 3.9, 4.0),
 * Pro generation, Claude models, GPT-OSS, and utility endpoints.
 */
export function synthesizeModelsFromDiscovery(models: Record<string, any>): ModelProfile[] {
  const list: ModelProfile[] = [];
  const denylist = new Set(["chat_20706", "chat_23310", "tab_flash_lite_preview", "tab_jump_flash_lite_preview"]);

  // 1. Group Flash generations to identify tiered endpoints vs specific SKU variants
  const flashFamilies = new Map<string, { tieredKey?: string; members: Map<string, any> }>();
  for (const [key, rawInfo] of Object.entries(models)) {
    if (denylist.has(key)) continue;
    const m = key.match(/^gemini-(\d+(?:\.\d+)?)-flash(?:-(tiered|high|medium|low|extra-low|lite))?$/i);
    if (m) {
      const ver = m[1];
      const tier = m[2]?.toLowerCase();
      if (tier === "lite") continue; // Flash Lite is handled separately
      if (!flashFamilies.has(ver)) {
        flashFamilies.set(ver, { members: new Map() });
      }
      const fam = flashFamilies.get(ver)!;
      if (tier === "tiered") {
        fam.tieredKey = key;
      }
      fam.members.set(tier || "base", rawInfo);
    }
  }

  // Synthesize Flash families (e.g. 3.8, 3.7, 3.6, 3.9, 4.0, etc.)
  for (const [ver, fam] of flashFamilies) {
    if (ver === "3.5") continue; // 3.5 has special tiered names handled below
    const baseInfo = fam.tieredKey ? fam.members.get("tiered") : (fam.members.get("base") || fam.members.get("high") || fam.members.values().next().value);
    const maxTokens = baseInfo?.maxTokens || 1_048_576;
    const maxOutputTokens = baseInfo?.maxOutputTokens || 65_536;
    const supportsImages = baseInfo?.supportsImages ?? true;
    const supportsTools = baseInfo?.supportsTools ?? true;

    const upstreamTiered = fam.tieredKey || `gemini-${ver}-flash-tiered`;
    const baseId = `gemini-${ver}-flash`;
    const baseName = `Gemini ${ver} Flash`;

    // Unified base model (supports user selecting :low, :medium, :high at request time)
    list.push({
      id: baseId,
      name: baseName,
      upstreamModelId: upstreamTiered,
      contextWindow: maxTokens,
      maxOutputTokens,
      supportsImages,
      supportsThinking: true,
      reasoningEfforts: ["minimal", "low", "medium", "high"],
      supportsTools
    });

    // Specific reasoning effort models
    list.push(
      {
        id: `${baseId}-high`,
        name: `${baseName} (High)`,
        upstreamModelId: fam.members.has("high") ? fam.members.get("high") : upstreamTiered,
        contextWindow: maxTokens,
        maxOutputTokens,
        supportsImages,
        supportsThinking: true,
        thinkingLevel: "high",
        reasoningEfforts: ["minimal", "low", "medium", "high"],
        supportsTools
      },
      {
        id: `${baseId}-medium`,
        name: `${baseName} (Medium)`,
        upstreamModelId: fam.members.has("medium") ? fam.members.get("medium") : upstreamTiered,
        contextWindow: maxTokens,
        maxOutputTokens,
        supportsImages,
        supportsThinking: true,
        thinkingLevel: "medium",
        reasoningEfforts: ["minimal", "low", "medium", "high"],
        supportsTools
      },
      {
        id: `${baseId}-low`,
        name: `${baseName} (Low)`,
        upstreamModelId: fam.members.has("low") ? fam.members.get("low") : upstreamTiered,
        contextWindow: maxTokens,
        maxOutputTokens,
        supportsImages,
        supportsThinking: true,
        thinkingLevel: "low",
        reasoningEfforts: ["minimal", "low", "medium", "high"],
        supportsTools
      }
    );
  }

  // 2. Synthesize Gemini 3.5 Flash family
  const has35 = models["gemini-3.5-flash-extra-low"] || models["gemini-3.5-flash-low"] || models["gemini-3-flash-agent"];
  if (has35) {
    const info35 = models["gemini-3-flash-agent"] || models["gemini-3.5-flash-low"] || models["gemini-3.5-flash-extra-low"];
    const maxTokens = info35?.maxTokens || 1_048_576;
    const maxOutputTokens = info35?.maxOutputTokens || 65_536;
    list.push(
      {
        id: "gemini-3.5-flash",
        name: "Gemini 3.5 Flash",
        upstreamModelId: "gemini-3-flash-agent",
        contextWindow: maxTokens,
        maxOutputTokens,
        supportsImages: true,
        supportsThinking: true,
        reasoningEfforts: ["minimal", "low", "medium", "high"],
        supportsTools: true
      },
      {
        id: "gemini-3.5-flash-high",
        name: "Gemini 3.5 Flash (High)",
        upstreamModelId: "gemini-3-flash-agent",
        contextWindow: maxTokens,
        maxOutputTokens,
        supportsImages: true,
        supportsThinking: true,
        thinkingLevel: "high",
        reasoningEfforts: ["minimal", "low", "medium", "high"],
        supportsTools: true
      },
      {
        id: "gemini-3.5-flash-medium",
        name: "Gemini 3.5 Flash (Medium)",
        upstreamModelId: "gemini-3.5-flash-low",
        contextWindow: maxTokens,
        maxOutputTokens,
        supportsImages: true,
        supportsThinking: true,
        thinkingLevel: "medium",
        reasoningEfforts: ["minimal", "low", "medium", "high"],
        supportsTools: true
      },
      {
        id: "gemini-3.5-flash-low",
        name: "Gemini 3.5 Flash (Low)",
        upstreamModelId: "gemini-3.5-flash-extra-low",
        contextWindow: maxTokens,
        maxOutputTokens,
        supportsImages: true,
        supportsThinking: true,
        thinkingLevel: "low",
        reasoningEfforts: ["minimal", "low", "medium", "high"],
        supportsTools: true
      }
    );
  }

  // 3. Synthesize Gemini Pro models (3.1 Pro & Pro Agent)
  const hasPro = models["gemini-pro-agent"] || models["gemini-3.1-pro-high"] || models["gemini-3.1-pro-low"];
  if (hasPro) {
    const infoPro = models["gemini-pro-agent"] || models["gemini-3.1-pro-high"] || models["gemini-3.1-pro-low"];
    const maxTokens = infoPro?.maxTokens || 1_048_576;
    const maxOutputTokens = Math.min(infoPro?.maxOutputTokens || 65_535, 65_535);
    list.push(
      {
        id: "gemini-3.1-pro",
        name: "Gemini 3.1 Pro",
        upstreamModelId: "gemini-pro-agent",
        contextWindow: maxTokens,
        maxOutputTokens,
        supportsImages: true,
        supportsThinking: true,
        reasoningEfforts: ["low", "high"],
        supportsTools: true
      },
      {
        id: "gemini-3.1-pro-high",
        name: "Gemini 3.1 Pro (High)",
        upstreamModelId: "gemini-pro-agent",
        contextWindow: maxTokens,
        maxOutputTokens,
        supportsImages: true,
        supportsThinking: true,
        thinkingLevel: "high",
        reasoningEfforts: ["low", "high"],
        supportsTools: true
      },
      {
        id: "gemini-3.1-pro-low",
        name: "Gemini 3.1 Pro (Low)",
        upstreamModelId: "gemini-3.1-pro-low",
        contextWindow: maxTokens,
        maxOutputTokens,
        supportsImages: true,
        supportsThinking: true,
        thinkingLevel: "low",
        reasoningEfforts: ["low", "high"],
        supportsTools: true
      },
      {
        id: "gemini-pro-agent",
        name: "Gemini Pro Agent",
        upstreamModelId: "gemini-pro-agent",
        contextWindow: maxTokens,
        maxOutputTokens,
        supportsImages: true,
        supportsThinking: true,
        thinkingLevel: "high",
        reasoningEfforts: ["low", "high"],
        supportsTools: true
      }
    );
  }

  // 4. Process all remaining models in payload
  for (const [key, rawInfo] of Object.entries(models)) {
    if (denylist.has(key)) continue;

    // Skip keys already synthesized into their canonical forms
    if (key.match(/^gemini-(\d+(?:\.\d+)?)-flash(?:-(tiered|high|medium|low))?$/i) && !key.includes("lite")) {
      continue;
    }
    if (key === "gemini-pro-agent" || key === "gemini-3.1-pro-high" || key === "gemini-3.1-pro-low") {
      continue;
    }
    if (key === "gemini-3.5-flash-extra-low" || key === "gemini-3.5-flash-low" || key === "gemini-3-flash-agent") {
      continue;
    }

    const info = rawInfo || {};
    const maxTokens = info.maxTokens || 1_048_576;
    const maxOutputTokens = info.maxOutputTokens || 65_536;
    const supportsImages = info.supportsImages ?? true;
    const supportsTools = info.supportsTools ?? true;

    // Claude models
    if (key.startsWith("claude-")) {
      const claudeContext = info.maxTokens || (key.includes("opus") ? 200_000 : 1_000_000);
      const claudeOutput = Math.min(info.maxOutputTokens || 64_000, 64_000);
      list.push({
        id: key,
        name: info.displayName || key,
        upstreamModelId: key,
        contextWindow: claudeContext,
        maxOutputTokens: claudeOutput,
        supportsImages: true,
        supportsThinking: true,
        reasoningEfforts: ["minimal", "low", "medium", "high"],
        supportsTools: true
      });
      if (key === "claude-opus-4-6-thinking") {
        list.push({
          id: "claude-opus-4-6",
          name: "Claude Opus 4.6",
          upstreamModelId: "claude-opus-4-6-thinking",
          contextWindow: claudeContext,
          maxOutputTokens: claudeOutput,
          supportsImages: true,
          supportsThinking: true,
          reasoningEfforts: ["minimal", "low", "medium", "high"],
          supportsTools: true
        });
      }
      continue;
    }

    // GPT-OSS models
    if (key.startsWith("gpt-oss")) {
      list.push({
        id: key,
        name: info.displayName || key,
        upstreamModelId: key,
        contextWindow: maxTokens,
        maxOutputTokens: Math.min(maxOutputTokens, 32_768),
        supportsImages: false,
        supportsThinking: true,
        reasoningEfforts: ["low", "medium", "high"],
        supportsTools: true
      });
      if (key === "gpt-oss-120b-medium") {
        list.push({
          id: "gpt-oss-120b",
          name: "GPT-OSS 120B",
          upstreamModelId: "gpt-oss-120b-medium",
          contextWindow: maxTokens,
          maxOutputTokens: Math.min(maxOutputTokens, 32_768),
          supportsImages: false,
          supportsThinking: true,
          reasoningEfforts: ["low", "medium", "high"],
          supportsTools: true
        });
      }
      continue;
    }

    // Generic / Utility / New models
    list.push({
      id: key,
      name: info.displayName || key,
      upstreamModelId: key,
      contextWindow: maxTokens,
      maxOutputTokens,
      supportsImages,
      supportsThinking: info.supportsThinking ?? (info.thinkingBudget !== undefined),
      reasoningEfforts: ["minimal", "low", "medium", "high"],
      supportsTools
    });
  }

  // Deduplicate preserving earliest synthesized items
  const seen = new Set<string>();
  const deduped: ModelProfile[] = [];
  for (const m of list) {
    if (!seen.has(m.id)) {
      seen.add(m.id);
      deduped.push(m);
    }
  }

  return deduped.length > 0 ? deduped : FALLBACK_MODELS;
}

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

    return synthesizeModelsFromDiscovery(payload.models);
  } catch (err) {
    console.error("[Antigravity] Model discovery exception:", err);
    return FALLBACK_MODELS;
  }
}
