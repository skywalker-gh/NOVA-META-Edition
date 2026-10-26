
import OpenAI from "openai";
import * as dotenv from "dotenv";
dotenv.config();

if (!process.env.META_API_KEY) {
  throw new Error("META_API_KEY missing in .env - get it from dev.meta.ai Dashboard");
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
