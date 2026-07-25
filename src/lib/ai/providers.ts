import "server-only";
import { anthropic } from "@ai-sdk/anthropic";
import { openai, createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

export type AiProviderName = "ollama" | "anthropic" | "openai";

export type ResolvedProvider = {
  name: AiProviderName;
  label: string;
  model: LanguageModel;
};

const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
// Configurable via env - no code change needed to switch models (e.g. back
// to the more capable but much slower qwen3:8b). See .env.example.
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "llama3.2:3b";

// Ollama's OpenAI-compatible endpoint (https://ollama.com/blog/openai-compatibility)
// lets it plug into the existing OpenAI provider instead of needing a
// dedicated Ollama package.
const ollamaProvider = createOpenAI({
  baseURL: `${OLLAMA_BASE_URL}/v1`,
  apiKey: "ollama", // required by the client shape; ignored by Ollama itself
});

async function isOllamaReachable(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`, {
      signal: AbortSignal.timeout(800),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Provider priority: Ollama (free, local, private) first, then whichever
// hosted API key is configured. Ollama at localhost is only ever reachable
// from this machine's own dev server - Vercel's servers can't see it - so
// this naturally makes Ollama the default in local dev while production
// falls through to Anthropic/OpenAI without any environment-specific code.
export async function resolveAiModel(): Promise<ResolvedProvider | null> {
  if (await isOllamaReachable()) {
    return {
      name: "ollama",
      label: `Ollama (${OLLAMA_MODEL})`,
      model: ollamaProvider.chat(OLLAMA_MODEL),
    };
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return {
      name: "anthropic",
      label: "Claude",
      model: anthropic("claude-sonnet-5"),
    };
  }
  if (process.env.OPENAI_API_KEY) {
    return { name: "openai", label: "GPT-4o", model: openai("gpt-4o") };
  }
  return null;
}
