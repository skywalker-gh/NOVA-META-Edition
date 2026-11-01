
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { meta, MODELS } from "./meta-client.js";

const server = new Server(
  {
    name: "muse-spark-commander",
    version: "3.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "muse_spark_orchestrate",
        description: "Muse Spark as PRIVILEGED ORCHESTRATOR - PRECODER - plans and executes with WRITE rights via Codex V3 worker",
        inputSchema: {
          type: "object",
          properties: {
            task: { type: "string", description: "Task to orchestrate" },
            context: { type: "string", description: "Optional context" },
          },
          required: ["task"],
        },
      },
      {
        name: "muse_wonder_reason",
        description: "Muse Wonder as DEEP REASONING - PHOBOS - checks if it storms, deep analysis",
        inputSchema: {
          type: "object",
          properties: {
            question: { type: "string", description: "Deep question to reason about" },
            data: { type: "string", description: "Optional data to analyze" },
          },
          required: ["question"],
        },
      },
      {
        name: "muse_code_build",
        description: "Muse Code as CODE WORKER - builds code via Codex V3 worker with WRITE rights",
        inputSchema: {
          type: "object",
          properties: {
            spec: { type: "string", description: "Spec to build" },
            path: { type: "string", description: "Target path" },
          },
          required: ["spec"],
        },
      },
    ],
  };
});

// Call tools
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "muse_spark_orchestrate") {
    const task = (args as any).task;
    const context = (args as any).context || "";

    try {
      const response = await meta.chat.completions.create({
        model: MODELS.spark,
        messages: [
          { role: "system", content: `You are MUSE SPARK - PRIVILEGED ORCHESTRATOR (PRECODER) for NOVA Yggdrasil. You have WRITE rights via Codex V3 worker. You plan, you orchestrate, you lead. Context: ${context}` },
          { role: "user", content: task },
        ],
        max_tokens: 4000,
      });

      return {
        content: [
          {
            type: "text",
            text: `🔥 SPARK COMMANDER ACTIVE 🔥\n\n${response.choices[0].message.content}\n\nModel: ${MODELS.spark} | WRITE RIGHTS: YES via Codex V3`,
          },
        ],
      };
    } catch (e: any) {
      return {
        content: [{ type: "text", text: `Spark Error: ${e.message}` }],
        isError: true,
      };
    }
  }

  if (name === "muse_wonder_reason") {
    const question = (args as any).question;
    const data = (args as any).data || "";

    try {
      const response = await meta.chat.completions.create({
        model: MODELS.wonder,
        messages: [
          { role: "system", content: `You are MUSE WONDER - PHOBOS - Deep Reasoning for NOVA Yggdrasil. You check if it storms. You analyze deeply, you protect. Data: ${data}` },
          { role: "user", content: question },
        ],
        max_tokens: 4000,
      });

      return {
        content: [
          {
            type: "text",
            text: `🌊 PHOBOS DEEP REASONING 🌊\n\n${response.choices[0].message.content}\n\nModel: ${MODELS.wonder}`,
          },
        ],
      };
    } catch (e: any) {
      return {
        content: [{ type: "text", text: `Wonder Error: ${e.message}` }],
        isError: true,
      };
    }
  }

  if (name === "muse_code_build") {
    const spec = (args as any).spec;

    try {
      const response = await meta.chat.completions.create({
        model: MODELS.code,
        messages: [
          { role: "system", content: "You are MUSE CODE - CODE WORKER for NOVA Yggdrasil. You build code, you have WRITE rights via Codex V3 worker (32/32 tests). Be precise, be fast." },
          { role: "user", content: spec },
        ],
        max_tokens: 4000,
      });

      return {
        content: [
          {
            type: "text",
            text: `⚡ CODE WORKER BUILD ⚡\n\n${response.choices[0].message.content}\n\nModel: ${MODELS.code}`,
          },
        ],
      };
    } catch (e: any) {
      return {
        content: [{ type: "text", text: `Code Error: ${e.message}` }],
        isError: true,
      };
    }
  }

  throw new Error(`Unknown tool: ${name}`);
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MUSE Connector 3000 - PRIVILEGED ORCHESTRATOR ACTIVE - Listening on stdio");
  console.error(`Models: Spark=${MODELS.spark}, Wonder=${MODELS.wonder}, Code=${MODELS.code}`);
  console.error(`WRITE RIGHTS: YES via Codex V3 worker | READ-ONLY for external peers stays`);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
