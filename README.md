# omp-plugin-antigravity

Multi-account Google Antigravity proxy and provider plugin for [oh-my-pi](https://github.com/can1357/oh-my-pi) (`omp`).

Enables automatic quota rotation, background quota health monitoring, real-time web search grounding, bulletproof tool call replay, and proxy streaming across multiple Google Antigravity OAuth accounts with automatic discovery and support for Gemini 3.x, Anthropic Claude, and GPT-OSS models.

---

## Highlights

- **Universal Multi-Account Discovery**: Automatically loads authenticated Google accounts from:
  - 9Router SQLite (`~/.9router/db/data.sqlite`, `%APPDATA%\9router\db\data.sqlite`, `$XDG_DATA_HOME`, or `NINEROUTER_DATA_DIR`)
  - oh-my-pi / pi-coding-agent `auth.json` (`~/.omp/agent/auth.json`, `~/.pi/agent/auth.json`, or `PI_CODING_AGENT_DIR`)
  - Dedicated plugin storage (`~/.omp/agent/antigravity-accounts.json`)
- **Zero-Dependency Interactive Login (`/ag login`)**: Standard PKCE OAuth 2.0 flow directly in your browser on port `51121`.
- **Bulk Account Import (`/ag import`)**: Import accounts from JSON files, JSON arrays, or comma-separated lists of refresh tokens.
- **Dynamic Model Auto-Discovery**: Automatically recognizes any new Flash generation (`gemini-X.Y-flash`), Pro generation, Claude, or GPT-OSS models from Google Cloud Code Assist discovery. Automatically synthesizes:
  - Unified base models (`gemini-3.8-flash`, `gemini-3.7-flash`, `gemini-3.6-flash`, `gemini-3.5-flash`, `gemini-3.1-pro`) with runtime reasoning effort control (`:minimal`, `:low`, `:medium`, `:high`)
  - Specific reasoning SKUs (`-high`, `-medium`, `-low`)
  - Automatic on-demand discovery refresh when newly released or uncatalogued models are queried
- **Rock-Solid Tool Calling & Thought Signature Replay**:
  - Full Gemini 3 `thoughtSignature` extraction, delta propagation, and in-memory cache
  - Automatic `skip_thought_signature_validator` fallback on all Gemini 3 family models (including `gemini-pro-agent`)
  - Correct `id: msg.tool_call_id` and function name preservation in tool response messages (fixing Claude 400 `tool_use_id: Field required`)
  - Merged parallel tool call responses into unified turns
  - Correct `finish_reason: "tool_calls"` signaling on tool invocation chunks
  - Schema normalization via `cleanJsonSchema` for Cloud Code Assist compatibility
- **Integrated Native Web Search Grounding**:
  - Automatically synchronizes active OAuth credentials to oh-my-pi's `agent.db` and `auth.json`, enabling oh-my-pi's native `web_search` using Gemini's live Google Search grounding.
- **5-Hour Rolling Pool & Quota Tracking**: Real-time inspection of Google's 5-hour quota reset windows (`remainingFraction` and `resetTime`) across independent backend counter buckets (`Google`, `Anthropic`, `OpenAI`).
- **Configurable Routing Strategies**:
  - `balanced` (default): Headroom-proportional selection with consecutive-use dampening and LRU fallback.
  - `quota-greedy`: Always routes to the account with the highest remaining quota fraction.
  - `lru`: Round-robin alternation across accounts.
  - `sticky`: Sticks with one account until its quota drops below 10%.
- **Background Quota Poller**: Automatically polls Google's `retrieveUserQuota` on a configurable interval (default: 60s) to keep quota meters accurate without latency overhead on user turns. Uses unref'd timers and unref'd server handles so CLI tasks like `omp models` exit cleanly without hanging.
- **Failover & Rate-Limit Backoff**: Automatic rotation to alternate accounts on HTTP 429 rate-limit responses with cooldown periods.

---

## Installation

### Prerequisites

- [Bun](https://bun.sh) (v1.0+)
- [oh-my-pi](https://github.com/can1357/oh-my-pi) (`omp`)

### Setup

1. Clone or download this repository:
   ```bash
   git clone https://github.com/your-username/omp-plugin-antigravity.git
   cd omp-plugin-antigravity
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Link the plugin to `omp`:
   ```bash
   omp plugin link .
   ```

4. Verify installation:
   ```bash
   omp plugin list
   ```
   You should see `omp-plugin-antigravity` in the installed plugin list.

---

## Available Models

The plugin automatically provides 35+ models across versions and reasoning levels:

| Model ID | Reasoning Effort | Context | Upstream Route |
|---|---|---|---|
| `antigravity/gemini-3.8-flash` | Dynamic (`:low`, `:medium`, `:high`) | 1M | `gemini-3.8-flash-tiered` |
| `antigravity/gemini-3.8-flash-high` | High | 1M | `gemini-3.8-flash-tiered` |
| `antigravity/gemini-3.8-flash-medium` | Medium | 1M | `gemini-3.8-flash-tiered` |
| `antigravity/gemini-3.8-flash-low` | Low | 1M | `gemini-3.8-flash-tiered` |
| `antigravity/gemini-3.7-flash` | Dynamic (`:low`, `:medium`, `:high`) | 1M | `gemini-3.7-flash-tiered` |
| `antigravity/gemini-3.7-flash-high` | High | 1M | `gemini-3.7-flash-tiered` |
| `antigravity/gemini-3.7-flash-medium` | Medium | 1M | `gemini-3.7-flash-tiered` |
| `antigravity/gemini-3.7-flash-low` | Low | 1M | `gemini-3.7-flash-tiered` |
| `antigravity/gemini-3.6-flash` | Dynamic (`:minimal`, `:low`, `:medium`, `:high`) | 1M | `gemini-3.6-flash-tiered` |
| `antigravity/gemini-3.6-flash-high` | High | 1M | `gemini-3.6-flash-high` |
| `antigravity/gemini-3.6-flash-medium` | Medium | 1M | `gemini-3.6-flash-medium` |
| `antigravity/gemini-3.6-flash-low` | Low | 1M | `gemini-3.6-flash-low` |
| `antigravity/gemini-3.5-flash` | Dynamic | 1M | `gemini-3-flash-agent` / tiered |
| `antigravity/gemini-3.5-flash-high` | High | 1M | `gemini-3-flash-agent` |
| `antigravity/gemini-3.5-flash-medium` | Medium | 1M | `gemini-3.5-flash-low` |
| `antigravity/gemini-3.5-flash-low` | Low | 1M | `gemini-3.5-flash-extra-low` |
| `antigravity/gemini-3.1-pro` | Dynamic (`:low`, `:high`) | 1M | `gemini-pro-agent` / `gemini-3.1-pro-low` |
| `antigravity/gemini-3.1-pro-high` | High | 1M | `gemini-pro-agent` |
| `antigravity/gemini-3.1-pro-low` | Low | 1M | `gemini-3.1-pro-low` |
| `antigravity/claude-sonnet-4-6` | Dynamic (`:minimal`, `:low`, `:medium`, `:high`) | 1M | `claude-sonnet-4-6` |
| `antigravity/claude-opus-4-6-thinking` | Dynamic | 200K | `claude-opus-4-6-thinking` |
| `antigravity/claude-opus-4-6` | Dynamic | 200K | `claude-opus-4-6-thinking` |
| `antigravity/gpt-oss-120b` | Dynamic (`:low`, `:medium`, `:high`) | 128K | `gpt-oss-120b-medium` |
| `antigravity/gpt-oss-120b-medium` | Medium | 128K | `gpt-oss-120b-medium` |
| `antigravity/gemini-3.1-flash-lite` | Web search model | 1M | `gemini-3.1-flash-lite` |
| `antigravity/gemini-3.1-flash-image` | Vision / Image generation | 1M | `gemini-3.1-flash-image` |
| `antigravity/gemini-2.5-pro` | Dynamic | 1M | `gemini-2.5-pro` |
| `antigravity/gemini-2.5-flash` | Dynamic | 1M | `gemini-2.5-flash` |

---

## Usage

Run `omp` pointing to any Antigravity model:

```bash
# Gemini 3.8 Flash with dynamic low reasoning effort
omp --model antigravity/gemini-3.8-flash:low

# Gemini 3.8 Flash explicit Medium reasoning SKU
omp --model antigravity/gemini-3.8-flash-medium

# Gemini 3.8 Flash explicit High reasoning SKU
omp --model antigravity/gemini-3.8-flash-high

# Anthropic Claude Sonnet 4.6 (Thinking)
omp --model antigravity/claude-sonnet-4-6

# Gemini 3.1 Pro (High)
omp --model antigravity/gemini-3.1-pro-high
```

### Setting as Default in oh-my-pi

Edit `~/.omp/agent/config.yml`:

```yaml
modelRoles:
  default: antigravity/gemini-3.8-flash:medium
```

---

## Slash Commands (`/ag`)

Inside an active interactive `omp` session:

| Command | Description |
|---|---|
| `/ag` | Shows account overview, quota summaries, and active routing strategy |
| `/ag usage` | Displays 5-hour quota pools with progress bars and reset countdowns |
| `/ag import <path \| json \| tokens>` | Bulk imports accounts |
| `/ag login` | Opens browser for OAuth login to add a new Google account |
| `/ag settings` | Inspects current plugin settings |
| `/ag settings strategy <name>` | Sets routing strategy (`balanced`, `lru`, `quota-greedy`, `sticky`) |
| `/ag settings poll <seconds>` | Changes background polling interval (minimum 15s) |
| `/ag test` | Verifies and refreshes tokens for the active account |
| `/ag reload` | Forces an immediate rescan of accounts, quotas, and remote models |

---

## Bulk Import Examples

### 1. From a JSON file

```text
/ag import ./my-accounts.json
```

Format of `my-accounts.json`:

```json
[
  {
    "email": "developer1@gmail.com",
    "refreshToken": "1//04...",
    "projectId": "aicode-consumers"
  },
  {
    "email": "developer2@gmail.com",
    "refreshToken": "1//04..."
  }
]
```

### 2. From an inline JSON string

```text
/ag import [{"email":"user@gmail.com","refreshToken":"1//04..."}]
```

### 3. From a list of refresh tokens

```text
/ag import 1//04tokenA..., 1//04tokenB...
```

---

## 5-Hour Quota Monitoring

Run `/ag usage` in `omp` to inspect live quota pools:

```text
=== Antigravity 5-Hour Quota Pools ===

[#1] developer1@gmail.com (aicode-consumers)
  • Gemini  [█████░░░░░] 54.4% | Reset: 1h 45m 12s
  • Claude  [█████████░] 98.2% | Reset: 5h 55m 11s
  • GPT-OSS [█████████░] 98.2%

[#2] developer2@gmail.com (aicode-consumers)
  • Gemini  [██████░░░░] 58.5% | Reset: 1h 45m 09s
  • Claude  [██████████] 100.0% | Reset: 6h 15m 00s
  • GPT-OSS [██████████] 100.0%
```

---

## Running Tests

Run the unit test suite:

```bash
bun test
```

Tests cover:
- Dynamic model synthesis for all Flash and Pro generations (e.g. 3.8, 3.7, 3.6, 3.5, 3.1, and future 3.9/4.0)
- Reasoning effort mapping and clamping (`minimal` -> `low` on 3.7+)
- Multi-tool calling and replay with `id` and declared function names for Claude and Gemini
- Thought signature caching and `SKIP_THOUGHT_SIGNATURE` sentinel fallback
- Account loading, token refreshing, and OAuth persistence in `agent.db` and `auth.json`
- Bulk import parsing (JSON files, strings, tokens)
- Proxy streaming and 5-hour quota distribution

---

## License

MIT
