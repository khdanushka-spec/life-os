export type AiProviderName = "anthropic" | "openai";

export function getAiProvider(): AiProviderName | null {
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  return null;
}

export function isAiConfigured(): boolean {
  return getAiProvider() !== null;
}
