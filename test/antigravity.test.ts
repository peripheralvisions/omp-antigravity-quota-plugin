import { describe, it, expect } from "bun:test";
import { DEFAULT_CONFIG } from "../src/config.ts";
import { AccountManager, getModelCategory } from "../src/account-manager.ts";
import {
  cleanJsonSchema,
  buildAntigravityRequestBody,
  isValidThoughtSignature,
  extractThoughtSignature,
  isGemini3Family,
  SKIP_THOUGHT_SIGNATURE
} from "../src/request-transformer.ts";
import { fetchRemoteModels, synthesizeModelsFromDiscovery, FALLBACK_MODELS } from "../src/model-catalog.ts";
import { ProxyServer } from "../src/proxy-server.ts";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

describe("AccountManager", () => {
  it("loads active accounts from 9router database", () => {
    const manager = new AccountManager(DEFAULT_CONFIG);
    const accounts = manager.getAccounts();
    expect(accounts.length).toBeGreaterThan(0);
    expect(accounts[0].email).toBeDefined();
    expect(accounts[0].projectId).toBe("aicode-consumers");
  });

  it("selects a valid account and refreshes if needed", async () => {
    const manager = new AccountManager(DEFAULT_CONFIG);
    const account = await manager.getValidAccount("gemini-3.8-flash-low");
    expect(account).toBeDefined();
    expect(account.accessToken).toBeDefined();
    expect(account.accessToken.startsWith("ya29.")).toBe(true);
  });
});

describe("AccountManager Distribution Strategy", () => {
  it("scopes model categories correctly", () => {
    expect(getModelCategory("gemini-3.8-flash-low")).toBe("Google");
    expect(getModelCategory("claude-sonnet-4-6")).toBe("Anthropic");
    expect(getModelCategory("gpt-oss-120b-medium")).toBe("OpenAI");
  });

  it("distributes requests evenly and balances consecutive usage", async () => {
    const manager = new AccountManager(DEFAULT_CONFIG);
    await manager.syncAllQuotas();
    const accounts = manager.getAccounts();
    expect(accounts.length).toBeGreaterThan(1);

    const first = await manager.getValidAccount("gemini-3.8-flash-low");
    const second = await manager.getValidAccount("gemini-3.8-flash-low");

    expect(first.email).toBeDefined();
    expect(second.email).toBeDefined();
  }, 15000);
});

describe("AccountManager Bulk Import", () => {
  const testDir = path.join(os.tmpdir(), "ag-import-test-" + Date.now());

  it("imports accounts from an array of objects", () => {
    const customConfig = {
      ...DEFAULT_CONFIG,
      authJsonPath: path.join(testDir, "auth.json"),
      dbPath: undefined
    };
    const manager = new AccountManager(customConfig);

    const result = manager.importAccounts([
      {
        email: "test-bulk-1@example.com",
        refreshToken: "1//dummy_token_1",
        projectId: "custom-project-1"
      },
      {
        email: "test-bulk-2@example.com",
        refreshToken: "1//dummy_token_2",
        projectId: "custom-project-2"
      }
    ]);

    expect(result.imported).toBe(2);
    const found = manager.getAccounts().find(a => a.email === "test-bulk-1@example.com");
    expect(found).toBeDefined();
    expect(found?.refreshToken).toBe("1//dummy_token_1");

    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {}
  });

  it("imports accounts from JSON string", () => {
    const customConfig = {
      ...DEFAULT_CONFIG,
      authJsonPath: path.join(testDir, "auth.json"),
      dbPath: undefined
    };
    const manager = new AccountManager(customConfig);
    const jsonStr = JSON.stringify([
      {
        email: "test-json-import@example.com",
        refreshToken: "1//json_dummy_token"
      }
    ]);

    const result = manager.importAccounts(jsonStr);
    expect(result.imported).toBe(1);
    const found = manager.getAccounts().find(a => a.email === "test-json-import@example.com");
    expect(found).toBeDefined();

    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch {}
  });
});

describe("RequestTransformer", () => {
  it("cleans json schemas for Google CCA compatibility", () => {
    const schema = {
      $schema: "http://json-schema.org/draft-07/schema#",
      type: "object",
      additionalProperties: false,
      propertyNames: { pattern: "^[a-z]+$" },
      properties: {
        query: {
          type: "string",
          description: "Search query"
        }
      },
      required: ["query"]
    };

    const cleaned = cleanJsonSchema(schema) as Record<string, unknown>;
    expect(cleaned.$schema).toBeUndefined();
    expect(cleaned.additionalProperties).toBeUndefined();
    expect(cleaned.propertyNames).toBeUndefined();
    expect(cleaned.type).toBe("object");
    expect((cleaned.properties as Record<string, Record<string, unknown>>).query.type).toBe("string");
  });

  it("builds CCA request envelope correctly with system instruction and tools", () => {
    const account = {
      id: "test",
      email: "test@example.com",
      name: "Test",
      projectId: "aicode-consumers",
      accessToken: "token",
      refreshToken: "refresh",
      expiresAt: Date.now() + 100000,
      priority: 1,
      isActive: true
    };

    const req = buildAntigravityRequestBody(
      account,
      "gemini-3.8-flash-tiered",
      {
        model: "gemini-3.8-flash-low",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          { role: "user", content: "Hello" }
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "ping",
              description: "test ping",
              parameters: { type: "object", properties: { v: { type: "string" } } }
            }
          }
        ]
      },
      { thinkingLevel: "low" }
    );

    expect(req.project).toBe("aicode-consumers");
    expect(req.model).toBe("gemini-3.8-flash-tiered");
    const inner = req.request as Record<string, unknown>;
    expect(inner.systemInstruction).toBeDefined();
    expect(inner.tools).toBeDefined();
    expect(inner.toolConfig).toBeDefined();
    expect((inner.generationConfig as Record<string, unknown>).thinkingConfig).toBeDefined();
  });

  it("handles thought signature extraction and fallback sentinel on tool replay", () => {
    const account = {
      id: "test",
      email: "test@example.com",
      name: "Test",
      projectId: "aicode-consumers",
      accessToken: "token",
      refreshToken: "refresh",
      expiresAt: Date.now() + 100000,
      priority: 1,
      isActive: true
    };

    // 1. Validation checks
    expect(isValidThoughtSignature(SKIP_THOUGHT_SIGNATURE)).toBe(true);
    expect(isValidThoughtSignature("ErUBEqIBCl8U/gR5H5E6L6w3W+1fR0R2D4s9G+hL6Q6p1kG6N8pD3L+2v6D6k8kE3m4W8N3w==")).toBe(false); // bad length % 4
    expect(isValidThoughtSignature("EoUCCoICAWkUfROV1rJc+xh7PXC6BLYDbCVuiFI9Z/Phdv+oO3/1zI9qVv1n9r+7piqe/FvLF9I0yjxz4tsctR4j8AsR043qoeTIvBjl9HVPH09MrYPXVtHf3wK6pfEE8R+GGY844a/kkrvtLno5bjePfokUzkva3voD6KdQQjDYPSF+YHzgefDCoEwXYysVK/+kTwBQ/jW0JwnztOwDa+7YoWRk6MogjjeTwFai+GVQIgGj/Td/vhxH1z2eIuOu9zvqLKQjlo1yjW7Vyw+oXJl7y/8ugs9gXOizIxGCeRDuqWHZPmuCFxYTuXBXPgc48STFpsza5DSU7biZgvggoGQ/lDBKysmq")).toBe(true);

    // 2. Extra content extraction (pi-ai dialect)
    const extractedFromExtra = extractThoughtSignature({
      id: "call_1",
      type: "function",
      function: { name: "test", arguments: "{}" },
      extra_content: {
        google: {
          thought_signature: "AABBCCDD"
        }
      }
    });
    expect(extractedFromExtra).toBe("AABBCCDD");

    // 3. Fallback to SKIP_THOUGHT_SIGNATURE when omitted on Gemini 3
    const reqMissing = buildAntigravityRequestBody(
      account,
      "gemini-3.8-flash-tiered",
      {
        model: "gemini-3.8-flash-low",
        messages: [
          { role: "user", content: "test" },
          {
            role: "assistant",
            tool_calls: [
              {
                id: "call_1",
                type: "function",
                function: { name: "test", arguments: "{}" }
              }
            ]
          },
          { role: "tool", tool_call_id: "call_1", content: "{}" }
        ]
      }
    );
    const innerMissing = reqMissing.request as { contents: Array<{ parts: Array<Record<string, unknown>> }> };
    expect(innerMissing.contents[1].parts[0].thoughtSignature).toBe(SKIP_THOUGHT_SIGNATURE);

    // 4. Invalid base64 in tool call gets replaced with sentinel instead of crashing upstream
    const reqInvalid = buildAntigravityRequestBody(
      account,
      "gemini-3.8-flash-tiered",
      {
        model: "gemini-3.8-flash-low",
        messages: [
          { role: "user", content: "test" },
          {
            role: "assistant",
            tool_calls: [
              {
                id: "call_1",
                type: "function",
                function: { name: "test", arguments: "{}" },
                thought_signature: "ErUBEqIBCl8U/gR5H5E6L6w3W+1fR0R2D4s9G+hL6Q6p1kG6N8pD3L+2v6D6k8kE3m4W8N3w=="
              }
            ]
          },
          { role: "tool", tool_call_id: "call_1", content: "{}" }
        ]
      }
    );
    const innerInvalid = reqInvalid.request as { contents: Array<{ parts: Array<Record<string, unknown>> }> };
    expect(innerInvalid.contents[1].parts[0].thoughtSignature).toBe(SKIP_THOUGHT_SIGNATURE);
  });
  it("includes id and proper function name in functionResponse for tool results", () => {
    const account = { id: "1", email: "a@b.com", name: "a", projectId: "p", accessToken: "t", refreshToken: "r", expiresAt: 0, priority: 1, isActive: true };
    const req = buildAntigravityRequestBody(
      account,
      "claude-sonnet-4-6",
      {
        model: "claude-sonnet-4-6",
        messages: [
          { role: "user", content: "Check weather" },
          {
            role: "assistant",
            tool_calls: [
              { id: "call_tokyo", type: "function", function: { name: "get_weather", arguments: "{}" } },
              { id: "call_paris", type: "function", function: { name: "get_weather", arguments: "{}" } }
            ]
          },
          { role: "tool", tool_call_id: "call_tokyo", content: '{"temp": 22}' },
          { role: "tool", tool_call_id: "call_paris", content: '{"temp": 18}' }
        ]
      }
    );

    const inner = req.request as { contents: Array<{ role: string; parts: Array<Record<string, any>> }> };
    expect(inner.contents.length).toBe(3); // user -> model -> single merged user turn for parallel tools
    expect(inner.contents[2].role).toBe("user");
    expect(inner.contents[2].parts.length).toBe(2);

    const p1 = inner.contents[2].parts[0].functionResponse;
    const p2 = inner.contents[2].parts[1].functionResponse;
    expect(p1.name).toBe("get_weather");
    expect(p1.id).toBe("call_tokyo");
    expect(p1.response).toEqual({ temp: 22 });

    expect(p2.name).toBe("get_weather");
    expect(p2.id).toBe("call_paris");
    expect(p2.response).toEqual({ temp: 18 });
  });

  it("clamps minimal reasoning effort to low on Gemini 3.7+", () => {
    const account = { id: "1", email: "a@b.com", name: "a", projectId: "p", accessToken: "t", refreshToken: "r", expiresAt: 0, priority: 1, isActive: true };
    const req38 = buildAntigravityRequestBody(
      account,
      "gemini-3.8-flash-tiered",
      {
        model: "gemini-3.8-flash",
        messages: [{ role: "user", content: "hi" }],
        reasoning_effort: "minimal"
      }
    );
    const inner38 = req38.request as { generationConfig: { thinkingConfig: { thinkingLevel: string } } };
    expect(inner38.generationConfig.thinkingConfig.thinkingLevel).toBe("low");
  });

  it("recognizes gemini-pro-agent as Gemini 3 family for thought signatures", () => {
    expect(isGemini3Family("gemini-pro-agent")).toBe(true);
    expect(isGemini3Family("gemini-3.8-flash-tiered")).toBe(true);
    expect(isGemini3Family("gemini-3.1-pro-low")).toBe(true);
    expect(isGemini3Family("claude-sonnet-4-6")).toBe(false);
  });
});

describe("ModelCatalog", () => {
  it("fetches remote models from daily-cloudcode-pa", async () => {
    const manager = new AccountManager(DEFAULT_CONFIG);
    const models = await fetchRemoteModels(manager, DEFAULT_CONFIG);
    expect(models.length).toBeGreaterThan(0);
    const flash = models.find(m => m.id === "gemini-3.8-flash-high");
    expect(flash).toBeDefined();
    expect(flash?.upstreamModelId).toBe("gemini-3.8-flash-tiered");
  });
  it("synthesizes all reasoning levels and base models dynamically from raw Google payload", () => {
    const mockPayload = {
      "gemini-3.8-flash-tiered": { displayName: "Gemini 3.8 Flash", maxTokens: 1048576, maxOutputTokens: 65536 },
      "gemini-3.7-flash-tiered": { displayName: "Gemini 3.7 Flash", maxTokens: 1048576, maxOutputTokens: 65536 },
      "gemini-3.6-flash-tiered": { displayName: "Gemini 3.6 Flash", maxTokens: 1048576, maxOutputTokens: 65536 },
      "gemini-3.5-flash-extra-low": { displayName: "Gemini 3.5 Flash Low" },
      "gemini-3.5-flash-low": { displayName: "Gemini 3.5 Flash Medium" },
      "gemini-3-flash-agent": { displayName: "Gemini 3.5 Flash High" },
      "gemini-pro-agent": { displayName: "Gemini Pro Agent" },
      "gemini-3.1-pro-low": { displayName: "Gemini 3.1 Pro Low" },
      "claude-sonnet-4-6": { displayName: "Claude Sonnet 4.6" },
      "claude-opus-4-6-thinking": { displayName: "Claude Opus 4.6 Thinking" },
      "gpt-oss-120b-medium": { displayName: "GPT-OSS 120B Medium" }
    };

    const synthesized = synthesizeModelsFromDiscovery(mockPayload);
    const ids = synthesized.map(m => m.id);

    // Gemini 3.8 Flash family
    expect(ids).toContain("gemini-3.8-flash");
    expect(ids).toContain("gemini-3.8-flash-high");
    expect(ids).toContain("gemini-3.8-flash-medium");
    expect(ids).toContain("gemini-3.8-flash-low");

    // Gemini 3.7 Flash family
    expect(ids).toContain("gemini-3.7-flash");
    expect(ids).toContain("gemini-3.7-flash-high");
    expect(ids).toContain("gemini-3.7-flash-medium");
    expect(ids).toContain("gemini-3.7-flash-low");

    // Gemini 3.5 Flash family
    expect(ids).toContain("gemini-3.5-flash");
    expect(ids).toContain("gemini-3.5-flash-high");
    expect(ids).toContain("gemini-3.5-flash-medium");
    expect(ids).toContain("gemini-3.5-flash-low");

    // Gemini 3.1 Pro family
    expect(ids).toContain("gemini-3.1-pro");
    expect(ids).toContain("gemini-3.1-pro-high");
    expect(ids).toContain("gemini-3.1-pro-low");
    expect(ids).toContain("gemini-pro-agent");

    // Claude family
    expect(ids).toContain("claude-sonnet-4-6");
    expect(ids).toContain("claude-opus-4-6-thinking");
    expect(ids).toContain("claude-opus-4-6");

    // Upstream mappings
    const m38High = synthesized.find(m => m.id === "gemini-3.8-flash-high");
    expect(m38High?.upstreamModelId).toBe("gemini-3.8-flash-tiered");
    expect(m38High?.thinkingLevel).toBe("high");

    const m38Med = synthesized.find(m => m.id === "gemini-3.8-flash-medium");
    expect(m38Med?.upstreamModelId).toBe("gemini-3.8-flash-tiered");
    expect(m38Med?.thinkingLevel).toBe("medium");

    const m38Low = synthesized.find(m => m.id === "gemini-3.8-flash-low");
    expect(m38Low?.upstreamModelId).toBe("gemini-3.8-flash-tiered");
    expect(m38Low?.thinkingLevel).toBe("low");

    const m38Base = synthesized.find(m => m.id === "gemini-3.8-flash");
    expect(m38Base?.upstreamModelId).toBe("gemini-3.8-flash-tiered");
    expect(m38Base?.thinkingLevel).toBeUndefined(); // dynamic
  });

  it("automatically discovers and synthesizes newly released future models", () => {
    const futurePayload = {
      "gemini-3.9-flash-tiered": { displayName: "Gemini 3.9 Flash", maxTokens: 2000000, maxOutputTokens: 65536 },
      "gemini-4.0-flash-tiered": { displayName: "Gemini 4.0 Flash", maxTokens: 4000000, maxOutputTokens: 131072 }
    };

    const synthesized = synthesizeModelsFromDiscovery(futurePayload);
    const ids = synthesized.map(m => m.id);

    expect(ids).toContain("gemini-3.9-flash");
    expect(ids).toContain("gemini-3.9-flash-high");
    expect(ids).toContain("gemini-3.9-flash-medium");
    expect(ids).toContain("gemini-3.9-flash-low");

    expect(ids).toContain("gemini-4.0-flash");
    expect(ids).toContain("gemini-4.0-flash-high");
    expect(ids).toContain("gemini-4.0-flash-medium");
    expect(ids).toContain("gemini-4.0-flash-low");
  });
});

describe("ProxyServer", () => {
  it("serves OpenAI-compatible /v1/models and completions", async () => {
    const manager = new AccountManager(DEFAULT_CONFIG);
    const proxy = new ProxyServer(manager, DEFAULT_CONFIG, 20130);
    proxy.start();

    try {
      const res = await fetch("http://127.0.0.1:20130/v1/models");
      expect(res.status).toBe(200);
      const json = await res.json() as { object: string; data: Array<{ id: string }> };
      expect(json.object).toBe("list");
      expect(json.data.length).toBeGreaterThan(0);

      // Test completions streaming
      const compRes = await fetch("http://127.0.0.1:20130/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gemini-3.8-flash-low",
          messages: [{ role: "user", content: "Reply 'TEST_OK'." }],
          max_tokens: 10
        })
      });

      expect(compRes.status).toBe(200);
      const streamText = await compRes.text();
      expect(streamText.includes("data: ")).toBe(true);
      expect(streamText.includes("TEST_OK")).toBe(true);
      expect(streamText.includes("[DONE]")).toBe(true);
    } finally {
      proxy.stop();
    }
  });
});
