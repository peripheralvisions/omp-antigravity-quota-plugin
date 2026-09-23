# omp-plugin-antigravity

Multi-account Google Antigravity proxy and provider plugin for [oh-my-pi](https://github.com/can1357/oh-my-pi) (`omp`).

Enables automatic quota rotation, background quota health monitoring, and proxy streaming across multiple Google Antigravity OAuth accounts with support for the latest Gemini 3.x, Anthropic Claude, and GPT-OSS models.

---

## Highlights

- **Universal Multi-Account Discovery**: Automatically loads authenticated Google accounts from:
  - 9Router SQLite (`~/.9router/db/data.sqlite`, `%APPDATA%\9router\db\data.sqlite`, `$XDG_DATA_HOME`, or `NINEROUTER_DATA_DIR`)
  - oh-my-pi / pi-coding-agent `auth.json` (`~/.omp/agent/auth.json`, `~/.pi/agent/auth.json`, or `PI_CODING_AGENT_DIR`)
  - Dedicated plugin storage (`~/.omp/agent/antigravity-accounts.json`)
- **Zero-Dependency Interactive Login (`/ag login`)**: Standard PKCE OAuth 2.0 flow directly in your browser on port `51121`.
- **Bulk Account Import (`/ag import`)**: Import accounts from JSON files, JSON arrays, or comma-separated lists of refresh tokens.
- **5-Hour Rolling Pool & Quota Tracking**: Real-time inspection of Google's 5-hour quota reset windows (`remainingFraction` and `resetTime`) across independent backend counter buckets (`Google`, `Anthropic`, `OpenAI`).
- **Configurable Routing Strategies**:
  - `balanced` (default): Headroom-proportional selection with consecutive-use dampening and LRU fallback.
  - `quota-greedy`: Always routes to the account with the highest remaining quota fraction.
  - `lru`: Round-robin alternation across accounts.
  - `sticky`: Sticks with one account until its quota drops below 10%.
- **Background Quota Poller**: Automatically polls Google's `retrieveUserQuota` on a configurable interval (default: 60s) to keep quota meters accurate without latency overhead on user turns.
- **Failover & Rate-Limit Backoff**: Automatic rotation to alternate accounts on HTTP 429 rate-limit responses with cooldown periods.
- **Latest Models & Thinking Protocol**: Dynamically fetches models via `v1internal:fetchAvailableModels`. Supports Gemini 3.8/3.7/3.6 Flash, 3.1 Pro, Anthropic Claude (`claude-sonnet-4-6`, `claude-opus-4-6-thinking`), and `gpt-oss-120b-medium`. Includes full Gemini 3 `thoughtSignature` support and Cloud Code Assist JSON Schema normalization.

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

## Usage

Run `omp` pointing to any Antigravity model:

```bash
# Latest Gemini 3.8 Flash
omp --model antigravity/gemini-3.8-flash-low

# Gemini 3.8 Flash High reasoning
omp --model antigravity/gemini-3.8-flash-high

# Anthropic Claude Sonnet 4.6 (Thinking)
omp --model antigravity/claude-sonnet-4-6

# Gemini 3.1 Pro
omp --model antigravity/gemini-3.1-pro-high
```

### Setting as Default in oh-my-pi

Edit `~/.omp/agent/config.yml`:

```yaml
modelRoles:
  default: antigravity/gemini-3.8-flash-low:medium
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
| `/ag reload` | Forces an immediate rescan of databases, quotas, and model catalog |

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
- Account loading, token refreshing, and OAuth persistence
- Bulk import parsing (JSON files, strings, tokens)
- Request translation and Cloud Code Assist JSON Schema normalization
- Remote model discovery and tier mapping
- Proxy streaming and 5-hour quota distribution

---

## License

MIT
