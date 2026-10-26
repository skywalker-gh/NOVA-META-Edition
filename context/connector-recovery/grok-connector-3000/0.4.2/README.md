# Grok // Connector 3000

## v0.4.1
- Retains the existing stdio MCP server and canonical Nova MCP architecture.
- Improves Streamable-HTTP probing with MCP protocol-version headers, session-ID handling, JSON/SSE response handling, and initialization support.
- Adds a `ping` handler to the local stdio MCP server.
- Does not create a second Nova MCP server.
- Keeps Grok project review read-only by default and credentials in environment variables.

## Required connection settings
- `NOVA_MCP_URL`: URL of the already-running canonical Nova Streamable-HTTP MCP endpoint.
- `NOVA_MCP_TOKEN`: optional bearer token if that endpoint requires it.
- `NOVA_PROJECT_ROOT`: local Nova project root for project-file tools.
- `XAI_API_KEY`: xAI API key for Grok requests.

The connector cannot establish the remote Nova connection until `NOVA_MCP_URL` (and any required authentication) is configured with the real endpoint. Use `nova_mcp_probe` with `initialize`, then `tools/list` to verify it. No endpoint or credentials are hard-coded.
