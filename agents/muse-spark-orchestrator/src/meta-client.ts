
import OpenAI from "openai";
import * as dotenv from "dotenv";
import * as path from "path";
import * as fs from "fs";

// Try to load .env from multiple locations - robust for OneDrive + nested folders
const possibleEnvPaths = [
  path.resolve(process.cwd(), ".env"), // current folder agents/muse-spark-orchestrator
  path.resolve(process.cwd(), "..", "..", ".env"), // NOVA-META-Edition root
  path.resolve(process.cwd(), "..", "..", "..", ".env"), // one more up if in OneDrive
  path.join(process.env.USERPROFILE || "", "OneDrive", "Desktop", "NOVA-META-Edition", ".env"),
  path.join(process.env.USERPROFILE || "", "OneDrive", "Desktop", "NOVA - Ygdrassil - Meta Hackathon - Muse Spark - Version 1.0", ".env"),
];

let loaded = false;
for (const envPath of possibleEnvPaths) {
  if (fs.existsSync(envPath)) {
    const result = dotenv.config({ path: envPath });
    if (!result.error && process.env.META_API_KEY) {
      console.error(`[MUSE] Loaded .env from ${envPath}`);
      loaded = true;
      break;
    }
  }
}

if (!loaded) {
  // Last try default dotenv
  dotenv.config();
}

if (!process.env.META_API_KEY) {
  console.error("\n=== DEBUG ===");
  console.error("Tried paths:", possibleEnvPaths);
  console.error("Current dir:", process.cwd());
  console.error("ENV META_API_KEY:", process.env.META_API_KEY ? "SET (hidden)" : "MISSING");
  console.error("Files in cwd:", fs.readdirSync(process.cwd()).slice(0,20));
  console.error("=== END DEBUG ===\n");
  throw new Error("META_API_KEY missing in .env - get it from dev.meta.ai Dashboard. Make sure .env is in NOVA-META-Edition root and contains META_API_KEY=...");
}

export const meta = new OpenAI({
  apiKey: process.env.META_API_KEY!,
  baseURL: process.env.META_ENDPOINT || "https://api.meta.ai/v1",
});

export const MODELS = {
  spark: process.env.MUSE_SPARK_MODEL || "muse-spark",
  wonder: process.env.MUSE_WONDER_MODEL || "muse-wonder-1.0",
  code: process.env.MUSE_CODE_MODEL || "muse-code",
};
