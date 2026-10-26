
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { orchestrateWithSpark, deepReasonWithWonder } from "./tools/orchestrate.js";
import { codeWithMuse } from "./tools/code.js";

const server = new Server({ name: "muse-connector-3000", version: "3.0.0" }, { capabilities: { tools: {} } });

// Tool definitions - PRIVILEGED
server.setRequestHandler("tools/list" as any, async () => ({
  tools: [
    {
      name: "muse_orchestrate",
      description: "Privileged orchestration via Muse Spark - can delegate and write via Codex V3 (WRITE ALLOWED)",
      inputSchema: { type: "object", properties: { task: { type: "string" }, context: { type: "string" } }, required: ["task"] }
    },
    {
      name: "muse_wonder_reason",
      description: "Deep reasoning via Muse Wonder for architecture decisions",
      inputSchema: { type: "object", properties: { question: { type: "string" } }, required: ["question"] }
    },
    {
      name: "muse_code_write",
      description: "Generate and write code via Muse Code + Codex V3 sandbox",
      inputSchema: { type: "object", properties: { instruction: { type: "string" }, targetPath: { type: "string" } }, required: ["instruction", "targetPath"] }
    },
    {
      name: "muse_peer_review",
      description: "Read-only peer review fallback (compatible with Grok/ChatGPT mode)",
      inputSchema: { type: "object", properties: { diff: { type: "string" } }, required: ["diff"] }
    }
  ]
}));

server.setRequestHandler("tools/call" as any, async (req: any) => {
  const { name, arguments: args } = req.params;
  if (name === "muse_orchestrate") {
    const out = await orchestrateWithSpark(args.task, args.context || "");
    return { content: [{ type: "text", text: out }] };
  }
  if (name === "muse_wonder_reason") {
    const out = await deepReasonWithWonder(args.question);
    return { content: [{ type: "text", text: out }] };
  }
  if (name === "muse_code_write") {
    const out = await codeWithMuse(args.instruction, args.targetPath);
    return { content: [{ type: "text", text: `CODE FOR ${args.targetPath}:\n\n${out}\n\n[To be written by Codex V3 Worker sandboxed]` }] };
  }
  if (name === "muse_peer_review") {
    const out = await deepReasonWithWonder(`Peer review this diff read-only: ${args.diff}`);
    return { content: [{ type: "text", text: out }] };
  }
  throw new Error(`Unknown tool ${name}`);
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("MUSE Connector 3000 - PRIVILEGED ORCHESTRATOR ACTIVE - Listening on stdio");
