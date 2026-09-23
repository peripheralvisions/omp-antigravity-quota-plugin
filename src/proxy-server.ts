import type { Server } from "bun";
import type { AccountManager } from "./account-manager.ts";
import type { AntigravityConfig } from "./types.ts";
import { buildAntigravityRequestBody, type OpenAIChatRequest } from "./request-transformer.ts";
import { FALLBACK_MODELS, type ModelProfile } from "./model-catalog.ts";

export class ProxyServer {
  private server: Server<unknown> | null = null;
  private accountManager: AccountManager;
  private config: AntigravityConfig;
  private port: number;
  private models: ModelProfile[] = FALLBACK_MODELS;

  constructor(accountManager: AccountManager, config: AntigravityConfig, port: number = 20129) {
    this.accountManager = accountManager;
    this.config = config;
    this.port = port;
  }

  public setModels(models: ModelProfile[]) {
    this.models = models;
  }

  public getBaseUrl(): string {
    return `http://127.0.0.1:${this.port}/v1`;
  }

  public start() {
    if (this.server) return;

    let attemptPort = this.port;
    let bound = false;

    for (let i = 0; i < 10; i++) {
      try {
        this.server = Bun.serve({
          port: attemptPort,
          fetch: async (req: Request) => {
            const url = new URL(req.url);

            const corsHeaders = {
              "Access-Control-Allow-Origin": "*",
              "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
              "Access-Control-Allow-Headers": "Content-Type, Authorization"
            };

            if (req.method === "OPTIONS") {
              return new Response(null, { headers: corsHeaders });
            }

            // Models list endpoint
            if (url.pathname === "/v1/models" || url.pathname === "/models") {
              const data = this.models.map(m => ({
                id: m.id,
                object: "model",
                created: Math.floor(Date.now() / 1000),
                owned_by: "google-antigravity",
                capabilities: {
                  vision: m.supportsImages,
                  tools: m.supportsTools,
                  reasoning: m.supportsThinking,
                  contextWindow: m.contextWindow,
                  maxOutput: m.maxOutputTokens
                }
              }));

              return new Response(JSON.stringify({ object: "list", data }), {
                headers: {
                  ...corsHeaders,
                  "Content-Type": "application/json"
                }
              });
            }

            // Chat completions endpoint
            if (url.pathname === "/v1/chat/completions" || url.pathname === "/chat/completions") {
              if (req.method !== "POST") {
                return new Response("Method Not Allowed", { status: 405, headers: corsHeaders });
              }

              let body: OpenAIChatRequest;
              try {
                body = (await req.json()) as OpenAIChatRequest;
              } catch {
                return new Response(JSON.stringify({ error: "Invalid JSON" }), {
                  status: 400,
                  headers: { ...corsHeaders, "Content-Type": "application/json" }
                });
              }

              return this.handleChatCompletions(body, corsHeaders);
            }

            // Health check
            if (url.pathname === "/health" || url.pathname === "/") {
              return new Response(JSON.stringify({ status: "ok", provider: "antigravity-proxy" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
              });
            }

            return new Response("Not Found", { status: 404, headers: corsHeaders });
          }
        });

        this.port = attemptPort;
        bound = true;
        break;
      } catch (err) {
        attemptPort++;
      }
    }

    if (!bound) {
      throw new Error(`Failed to bind Antigravity proxy on ports ${this.port}-${attemptPort}`);
    }

    console.log(`[Antigravity Proxy] Started listening on http://127.0.0.1:${this.port}`);
  }

  public stop() {
    if (this.server) {
      this.server.stop();
      this.server = null;
    }
  }

  private async handleChatCompletions(
    request: OpenAIChatRequest,
    corsHeaders: Record<string, string>
  ): Promise<Response> {
    const rawModelId = request.model.replace(/^ag\//, "").replace(/^google-antigravity\//, "");
    const profile = this.models.find(m => m.id === rawModelId || m.id === request.model) || {
      id: rawModelId,
      name: rawModelId,
      upstreamModelId: rawModelId,
      contextWindow: 1_048_576,
      maxOutputTokens: 65_536,
      supportsImages: true,
      supportsThinking: true,
      supportsTools: true
    };

    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      let account;
      try {
        account = await this.accountManager.getValidAccount(profile.upstreamModelId);
      } catch (err) {
        return new Response(
          JSON.stringify({
            error: {
              message: (err as Error).message,
              type: "authentication_error"
            }
          }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const thinkingOverride = profile.thinkingLevel ? { thinkingLevel: profile.thinkingLevel } : undefined;
      const upstreamBody = buildAntigravityRequestBody(account, profile.upstreamModelId, request, thinkingOverride);

      const isClaude = profile.upstreamModelId.startsWith("claude-");
      const headers: Record<string, string> = {
        Authorization: `Bearer ${account.accessToken}`,
        "Content-Type": "application/json",
        "User-Agent": this.config.userAgent
      };
      if (isClaude) {
        headers["anthropic-beta"] = "interleaved-thinking-2025-05-14";
      }

      try {
        const upstreamRes = await fetch(`${this.config.endpoint}/v1internal:streamGenerateContent?alt=sse`, {
          method: "POST",
          headers,
          body: JSON.stringify(upstreamBody)
        });

        if (upstreamRes.status === 429) {
          console.warn(`[Antigravity Proxy] 429 Rate limited for ${account.email}, rotating account...`);
          this.accountManager.markRateLimited(account.id);
          continue;
        }

        if (upstreamRes.status === 401) {
          console.warn(`[Antigravity Proxy] 401 Unauthorized for ${account.email}, forcing refresh...`);
          await this.accountManager.refreshAccountToken(account);
          continue;
        }

        if (!upstreamRes.ok) {
          const errText = await upstreamRes.text();
          throw new Error(`Upstream error ${upstreamRes.status}: ${errText}`);
        }

        return this.createOpenAISseStreamResponse(upstreamRes, profile.id, corsHeaders);
      } catch (err) {
        lastError = err as Error;
        console.error(`[Antigravity Proxy] Attempt ${attempt + 1} failed:`, err);
      }
    }

    return new Response(
      JSON.stringify({
        error: {
          message: lastError ? lastError.message : "Failed after retrying across accounts",
          type: "upstream_error"
        }
      }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  private createOpenAISseStreamResponse(
    upstreamRes: Response,
    modelId: string,
    corsHeaders: Record<string, string>
  ): Response {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const upstreamBody = upstreamRes.body;

    if (!upstreamBody) {
      return new Response("No response body", { status: 500, headers: corsHeaders });
    }

    const streamId = "chatcmpl-" + Math.random().toString(36).substring(2, 15);
    const created = Math.floor(Date.now() / 1000);

    const transformStream = new ReadableStream({
      async start(controller) {
        const reader = upstreamBody.getReader();
        let buffer = "";
        let toolCallIndex = 0;
        const initialChunk = {
          id: streamId,
          object: "chat.completion.chunk",
          created,
          model: modelId,
          choices: [
            {
              index: 0,
              delta: { role: "assistant" },
              finish_reason: null
            }
          ]
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialChunk)}\n\n`));

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith("data: ")) continue;

              const jsonStr = trimmed.slice(6);
              if (jsonStr === "[DONE]") continue;

              try {
                const parsed = JSON.parse(jsonStr) as {
                  response?: {
                    candidates?: Array<{
                      content?: {
                        parts?: Array<{
                          text?: string;
                          thought?: boolean;
                          thoughtSignature?: string;
                          thought_signature?: string;
                          functionCall?: {
                            id?: string;
                            name: string;
                            args?: Record<string, unknown>;
                          };
                        }>;
                      };
                      finishReason?: string;
                    }>;
                    usageMetadata?: {
                      promptTokenCount?: number;
                      candidatesTokenCount?: number;
                      totalTokenCount?: number;
                    };
                  };
                };

                const candidate = parsed.response?.candidates?.[0];
                if (candidate?.content?.parts) {
                  for (const part of candidate.content.parts) {
                    if (part.text) {
                      const textChunk = {
                        id: streamId,
                        object: "chat.completion.chunk",
                        created,
                        model: modelId,
                        choices: [
                          {
                            index: 0,
                            delta: { content: part.text },
                            finish_reason: null
                          }
                        ]
                      };
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify(textChunk)}\n\n`));
                    }

                    if (part.functionCall) {
                      const toolCallDelta: Record<string, unknown> = {
                        index: toolCallIndex++,
                        id: part.functionCall.id || "call_" + Math.random().toString(36).substring(2, 9),
                        type: "function",
                        function: {
                          name: part.functionCall.name,
                          arguments: JSON.stringify(part.functionCall.args || {})
                        }
                      };

                      // Preserve thought signature in tool call chunk for subsequent turns (both direct & pi-ai extra_content)
                      const sig = part.thoughtSignature || part.thought_signature;
                      if (typeof sig === "string" && sig) {
                        toolCallDelta.thought_signature = sig;
                        toolCallDelta.extra_content = {
                          google: {
                            thought_signature: sig
                          }
                        };
                      }
                      const toolCallChunk = {
                        id: streamId,
                        object: "chat.completion.chunk",
                        created,
                        model: modelId,
                        choices: [
                          {
                            index: 0,
                            delta: {
                              tool_calls: [toolCallDelta]
                            },
                            finish_reason: null
                          }
                        ]
                      };
                      controller.enqueue(encoder.encode(`data: ${JSON.stringify(toolCallChunk)}\n\n`));
                    }
                  }
                }

                if (candidate?.finishReason) {
                  const finishReason = candidate.finishReason === "STOP" ? "stop" : candidate.finishReason.toLowerCase();
                  const finalChunk = {
                    id: streamId,
                    object: "chat.completion.chunk",
                    created,
                    model: modelId,
                    choices: [
                      {
                        index: 0,
                        delta: {},
                        finish_reason: finishReason
                      }
                    ]
                  };
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify(finalChunk)}\n\n`));
                }
              } catch {}
            }
          }
        } catch (err) {
          controller.error(err);
        } finally {
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          controller.close();
        }
      }
    });

    return new Response(transformStream, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive"
      }
    });
  }
}
