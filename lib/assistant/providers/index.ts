/**
 * Austauschbare Sprachmodell-Anbieter.
 *
 * ASSISTANT_PROVIDER:
 *   local              (Standard) Kein Sprachmodell. Regelbasierte Antworten
 *                      ausschließlich aus Konfiguration und Wissensbasis.
 *                      Es verlassen keine Daten den Server.
 *   openai-compatible  Jeder Anbieter mit OpenAI-kompatibler Chat-API, z. B.
 *                      EU-gehostete Modelle (IONOS AI Model Hub, STACKIT,
 *                      Mistral La Plateforme, OVHcloud) oder ein eigenes
 *                      Modell via vLLM/Ollama im kommunalen Rechenzentrum.
 *   anthropic          Claude über die Anthropic API.
 *
 * API-Schlüssel werden ausschließlich serverseitig aus Umgebungsvariablen
 * gelesen und nie an den Browser übertragen.
 */
import "server-only";
import { anthropicProvider } from "./anthropic";
import { openAiCompatibleProvider } from "./openai-compatible";

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface LlmProvider {
  name: string;
  complete(system: string, messages: ChatMessage[]): Promise<string>;
}

export function getProvider(): LlmProvider | null {
  switch (process.env.ASSISTANT_PROVIDER) {
    case "anthropic":
      return anthropicProvider();
    case "openai-compatible":
      return openAiCompatibleProvider();
    default:
      return null;
  }
}
