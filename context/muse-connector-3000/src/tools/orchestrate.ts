
import { meta, MODELS } from "../meta-client.js";

/**
 * PRIVILEGED ORCHESTRATOR - Write allowed via Codex V3 Worker
 * Unlike Grok/ChatGPT read-only reviewers, this can delegate and write
 */
export async function orchestrateWithSpark(task: string, context: string) {
  const res = await meta.chat.completions.create({
    model: MODELS.spark,
    messages: [
      { role: "system", content: `You are NOVA Yggdrasil privileged orchestrator. You can plan, delegate to Codex V3 Worker, and write inside NOVA_PROJECT_ROOT. Context: ${context}` },
      { role: "user", content: task }
    ],
    temperature: 0.4,
  });
  return res.choices[0].message.content;
}

export async function deepReasonWithWonder(architectureQuestion: string) {
  const res = await meta.chat.completions.create({
    model: MODELS.wonder,
    messages: [
      { role: "system", content: "You are Muse Wonder deep reasoning for system architecture. Analyze tradeoffs, propose canonical MCP path, respect workspace sandboxing." },
      { role: "user", content: architectureQuestion }
    ],
    temperature: 0.2,
  });
  return res.choices[0].message.content;
}
