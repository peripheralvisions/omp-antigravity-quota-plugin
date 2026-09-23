import type { AntigravityAccount } from "./types.ts";
import { normalizeSchemaForCCA } from "@oh-my-pi/pi-ai/utils/schema/normalize";

export interface OpenAIMessage {
  role: "system" | "user" | "assistant" | "tool";
  content?: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
  tool_calls?: Array<{
    id: string;
    type: "function";
    function: {
      name: string;
      arguments: string;
    };
    thought_signature?: string;
    thoughtSignature?: string;
    extra_content?: {
      google?: { thought_signature?: string };
      vertex?: { thought_signature?: string };
    };
  }>;
  reasoning_details?: unknown[];
  tool_call_id?: string;
}

export interface OpenAITool {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
}

export interface OpenAIChatRequest {
  model: string;
  messages: OpenAIMessage[];
  tools?: OpenAITool[];
  tool_choice?: unknown;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  max_completion_tokens?: number;
  stream?: boolean;
  reasoning_effort?: "minimal" | "low" | "medium" | "high" | "xhigh" | "max";
}

export function cleanJsonSchema(schema: unknown): unknown {
  try {
    return normalizeSchemaForCCA(schema);
  } catch {
    return { type: "OBJECT", properties: {} };
  }
}

// Cloud Code Assist bypass sentinel for Gemini 3 tool call replay when thought signature is absent
export const SKIP_THOUGHT_SIGNATURE = "skip_thought_signature_validator";

const base64SignaturePattern = /^[A-Za-z0-9+/_-]+={0,2}$/;

export function isValidThoughtSignature(signature: unknown): signature is string {
  if (typeof signature !== "string" || !signature.trim()) return false;
  const trimmed = signature.trim();
  if (trimmed === SKIP_THOUGHT_SIGNATURE) return true;
  if (trimmed.length % 4 !== 0) return false;
  return base64SignaturePattern.test(trimmed);
}

export function extractThoughtSignature(
  tc: NonNullable<OpenAIMessage["tool_calls"]>[number],
  msg?: OpenAIMessage
): string | undefined {
  if (isValidThoughtSignature(tc.thought_signature)) {
    return tc.thought_signature.trim();
  }
  if (isValidThoughtSignature(tc.thoughtSignature)) {
    return tc.thoughtSignature.trim();
  }

  // pi-ai / oh-my-pi OpenAI-completions dialect:
  // replayedToolCall.extra_content = { google: { thought_signature: "..." } }
  if (tc.extra_content && typeof tc.extra_content === "object") {
    for (const ns of ["google", "vertex"] as const) {
      const providerContent = tc.extra_content[ns];
      if (providerContent && typeof providerContent === "object") {
        const sig = providerContent.thought_signature;
        if (isValidThoughtSignature(sig)) {
          return sig.trim();
        }
      }
    }
  }

  // Check reasoning_details on the assistant message if present
  if (msg && Array.isArray(msg.reasoning_details)) {
    for (const detail of msg.reasoning_details) {
      if (detail && typeof detail === "object") {
        const d = detail as Record<string, unknown>;
        if (
          d.type === "reasoning.encrypted" &&
          (d.id === tc.id || !tc.id) &&
          isValidThoughtSignature(d.data)
        ) {
          return (d.data as string).trim();
        }
        for (const ns of ["google", "vertex"] as const) {
          const g = d[ns];
          if (g && typeof g === "object") {
            const sig = (g as Record<string, unknown>).thought_signature;
            if (isValidThoughtSignature(sig)) {
              return (sig as string).trim();
            }
          }
        }
      }
    }
  }

  return undefined;
}
export function buildAntigravityRequestBody(
  account: AntigravityAccount,
  upstreamModelId: string,
  request: OpenAIChatRequest,
  thinkingOverride?: { thinkingLevel?: string; thinkingBudget?: number }
): Record<string, unknown> {
  const contents: Array<{
    role: "user" | "model";
    parts: Array<Record<string, unknown>>;
  }> = [];

  let systemInstructionText = "";

  for (const msg of request.messages) {
    if (msg.role === "system") {
      const text = typeof msg.content === "string" ? msg.content : (msg.content?.map(c => c.text).filter(Boolean).join("\n") || "");
      if (text) {
        systemInstructionText = systemInstructionText ? `${systemInstructionText}\n\n${text}` : text;
      }
      continue;
    }

    if (msg.role === "user") {
      const parts: Array<Record<string, unknown>> = [];
      if (typeof msg.content === "string") {
        if (msg.content) parts.push({ text: msg.content });
      } else if (Array.isArray(msg.content)) {
        for (const item of msg.content) {
          if (item.type === "text" && item.text) {
            parts.push({ text: item.text });
          } else if (item.type === "image_url" && item.image_url?.url) {
            const url = item.image_url.url;
            if (url.startsWith("data:")) {
              const [header, b64] = url.split(";base64,");
              const mimeType = header.replace("data:", "");
              parts.push({
                inlineData: {
                  mimeType,
                  data: b64
                }
              });
            }
          }
        }
      }
      if (parts.length > 0) {
        contents.push({ role: "user", parts });
      }
    } else if (msg.role === "assistant") {
      const parts: Array<Record<string, unknown>> = [];
      if (typeof msg.content === "string" && msg.content) {
        parts.push({ text: msg.content });
      }

      if (msg.tool_calls && Array.isArray(msg.tool_calls)) {
        for (const tc of msg.tool_calls) {
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(tc.function.arguments || "{}");
          } catch {}

          const part: Record<string, unknown> = {
            functionCall: {
              name: tc.function.name,
              args,
              id: tc.id
            }
          };

          // Google CCA requires thought_signature for replayed function calls on Gemini 3+
          const sig = extractThoughtSignature(tc, msg);
          if (sig) {
            part.thoughtSignature = sig;
          } else if (upstreamModelId.includes("gemini-3")) {
            part.thoughtSignature = SKIP_THOUGHT_SIGNATURE;
          }

          parts.push(part);
        }
      }

      if (parts.length > 0) {
        contents.push({ role: "model", parts });
      }
    } else if (msg.role === "tool") {
      let parsedOutput: unknown;
      try {
        parsedOutput = JSON.parse(typeof msg.content === "string" ? msg.content : "{}");
      } catch {
        parsedOutput = { result: msg.content };
      }

      contents.push({
        role: "user",
        parts: [
          {
            functionResponse: {
              name: msg.tool_call_id || "tool_result",
              response: typeof parsedOutput === "object" && parsedOutput !== null ? parsedOutput : { result: parsedOutput }
            }
          }
        ]
      });
    }
  }

  const generationConfig: Record<string, unknown> = {};
  if (typeof request.temperature === "number") generationConfig.temperature = request.temperature;
  if (typeof request.top_p === "number") generationConfig.topP = request.top_p;

  const maxTokens = request.max_completion_tokens ?? request.max_tokens;
  if (typeof maxTokens === "number" && maxTokens > 0) {
    generationConfig.maxOutputTokens = maxTokens;
  }

  const isClaude = upstreamModelId.startsWith("claude-");
  const isGemini3 = upstreamModelId.includes("gemini-3");

  if (isGemini3) {
    let level = thinkingOverride?.thinkingLevel;
    if (!level && request.reasoning_effort) {
      if (request.reasoning_effort === "minimal") level = "minimal";
      else if (request.reasoning_effort === "low") level = "low";
      else if (request.reasoning_effort === "medium") level = "medium";
      else if (request.reasoning_effort === "high" || request.reasoning_effort === "xhigh" || request.reasoning_effort === "max") level = "high";
    }
    generationConfig.thinkingConfig = {
      thinkingLevel: level || "low"
    };
  } else if (!isClaude && thinkingOverride?.thinkingBudget) {
    generationConfig.thinkingConfig = {
      thinkingBudget: thinkingOverride.thinkingBudget
    };
  }

  const tools: Array<Record<string, unknown>> = [];
  if (request.tools && request.tools.length > 0) {
    const functionDeclarations = request.tools
      .filter(t => t.type === "function" && t.function?.name)
      .map(t => ({
        name: t.function.name,
        description: t.function.description || "",
        parameters: cleanJsonSchema(t.function.parameters || { type: "object", properties: {} })
      }));

    if (functionDeclarations.length > 0) {
      tools.push({ functionDeclarations });
    }
  }

  const innerRequest: Record<string, unknown> = {
    contents,
    generationConfig
  };

  if (systemInstructionText) {
    innerRequest.systemInstruction = {
      role: "user",
      parts: [{ text: systemInstructionText }]
    };
  }

  if (tools.length > 0) {
    innerRequest.tools = tools;
    innerRequest.toolConfig = {
      functionCallingConfig: {
        mode: "VALIDATED"
      }
    };
  }

  return {
    project: account.projectId,
    model: upstreamModelId,
    request: innerRequest
  };
}
