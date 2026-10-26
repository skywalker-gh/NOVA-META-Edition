
import { meta, MODELS } from "../meta-client.js";

export async function codeWithMuse(instruction: string, targetPath: string) {
  // This calls Muse Code to generate code, then Codex V3 worker will write it sandboxed
  const res = await meta.chat.completions.create({
    model: MODELS.code,
    messages: [
      { role: "system", content: `You are Muse Code for NOVA. Generate code for ${targetPath}. Keep canonical MCP principle. Output only code.` },
      { role: "user", content: instruction }
    ],
  });
  return res.choices[0].message.content;
}
