import type { AntigravityConfig } from "./types.ts";
import os from "node:os";
import path from "node:path";
import fs from "node:fs";

/**
 * Universally resolve 9router SQLite path across OSes and custom data directories
 */
export function resolve9routerDbPaths(): string[] {
  const candidates: string[] = [];

  if (process.env.NINEROUTER_DATA_DIR) {
    candidates.push(path.join(process.env.NINEROUTER_DATA_DIR, "db", "data.sqlite"));
  }

  if (process.platform === "win32") {
    const appData = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
    candidates.push(path.join(appData, "9router", "db", "data.sqlite"));
  }

  candidates.push(path.join(os.homedir(), ".9router", "db", "data.sqlite"));

  if (process.env.XDG_DATA_HOME) {
    candidates.push(path.join(process.env.XDG_DATA_HOME, "9router", "db", "data.sqlite"));
  }

  return candidates.filter(p => fs.existsSync(p));
}

/**
 * Universally resolve oh-my-pi and pi-coding-agent auth.json paths
 */
export function resolveOmpAuthPaths(): string[] {
  const candidates: string[] = [];

  if (process.env.PI_CODING_AGENT_DIR) {
    candidates.push(path.join(process.env.PI_CODING_AGENT_DIR, "auth.json"));
  }

  candidates.push(path.join(os.homedir(), ".omp", "agent", "auth.json"));
  candidates.push(path.join(os.homedir(), ".pi", "agent", "auth.json"));

  if (process.env.XDG_DATA_HOME) {
    candidates.push(path.join(process.env.XDG_DATA_HOME, "omp", "agent", "auth.json"));
  }

  return candidates.filter(p => fs.existsSync(p));
}

/**
 * Universal dedicated storage directory for this plugin
 */
export function getPluginStorageDir(): string {
  if (process.env.PI_CODING_AGENT_DIR) {
    return process.env.PI_CODING_AGENT_DIR;
  }
  return path.join(os.homedir(), ".omp", "agent");
}

export const DEFAULT_CONFIG: AntigravityConfig = {
  endpoint: process.env.ANTIGRAVITY_ENDPOINT || "https://daily-cloudcode-pa.googleapis.com",
  sandboxEndpoint: process.env.ANTIGRAVITY_SANDBOX_ENDPOINT || "https://daily-cloudcode-pa.sandbox.googleapis.com",
  clientId: "1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com",
  clientSecret: "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",
  userAgent: `antigravity/hub/1.107.0 (aidev_client; os_type=${process.platform}; arch=${process.arch}; cl=732483584)`,
  authJsonPath: path.join(os.homedir(), ".omp", "agent", "auth.json"),
  tokenRefreshSkewMs: 120_000
};
