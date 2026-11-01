
# Muse Connector 3000 - NOVA Yggdrasil

## Status: PRIVILEGED ORCHESTRATOR (WRITE ALLOWED)

Unlike grok-connector-3000 and chatgpt-claude-connector-3000 which are READ-ONLY,
this connector has orchestrator privileges per Governance Rule #5.

### Why this matters
Gemini CLI currently has a hang. This connector replaces Gemini as strategic orchestrator.

### Setup
1. cp .env.example .env
2. Add META_API_KEY from dev.meta.ai Dashboard
3. npm install
4. npm run dev

### Integration in dashboard (127.0.0.1:8000)
Add to your dashboard config:
```json
{
  "name": "Muse Connector",
  "port": 3000,
  "status": "ACTIVE",
  "models": ["muse-spark", "muse-wonder-1.0", "muse-code"],
  "privilege": "ORCHESTRATOR_WRITE"
}
```

### MCP Registration (in root mcp.json)
```json
{
  "mcpServers": {
    "muse-connector-3000": {
      "command": "node",
      "args": ["./muse-connector-3000/src/index.ts"],
      "env": { "META_API_KEY": "${META_API_KEY}" }
    }
  }
}
```

### Security
- Still respects NOVA_PROJECT_ROOT sandboxing
- All writes go via Codex V3 worker + PostgreSQL logging
- Credentials only in .env, never committed
