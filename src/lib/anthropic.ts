import Anthropic from "@anthropic-ai/sdk";

// SADECE server action / route handler içinde kullanın (ANTHROPIC_API_KEY
// server-only bir ortam değişkeni — "use client" dosyalarına import etmeyin).
let client: Anthropic | null = null;

export function getAnthropicClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY tanımlı değil (sunucu ortam değişkeni).");
  }
  if (!client) client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return client;
}
