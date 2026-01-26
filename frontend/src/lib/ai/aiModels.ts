/**
 * AI Model ID type - string union for type safety
 */
export type AIModelId =
  | "openai/gpt-4o-mini"
  | "openai/gpt-5-mini"
  | "google/gemini-2.5-flash"
  | "x-ai/grok-4.1-fast"
  | "anthropic/claude-sonnet-4.5"
  | "deepseek/deepseek-v3.2";

/**
 * AI Model option for select dropdown
 */
export interface AIModelOptionVm {
  value: AIModelId;
  label: string;
}

/**
 * Default AI model
 */
export const DEFAULT_AI_MODEL: AIModelId = "openai/gpt-4o-mini";

/**
 * Available AI models for selection
 */
export const AI_MODEL_OPTIONS: AIModelOptionVm[] = [
  { value: "openai/gpt-4o-mini", label: "OpenAI GPT-4o Mini (domyślny)" },
  { value: "openai/gpt-5-mini", label: "OpenAI GPT-5 Mini" },
  { value: "google/gemini-2.5-flash", label: "Google Gemini 2.5 Flash" },
  { value: "x-ai/grok-4.1-fast", label: "xAI Grok 4.1 Fast" },
  { value: "anthropic/claude-sonnet-4.5", label: "Anthropic Claude Sonnet 4.5" },
  { value: "deepseek/deepseek-v3.2", label: "DeepSeek v3.2" },
];

/**
 * Set of valid AI model IDs for quick validation
 */
export const AI_MODEL_IDS = new Set<string>(AI_MODEL_OPTIONS.map((opt) => opt.value));

/**
 * Validates if a string is a valid AI model ID
 * @param value - The value to validate
 * @returns true if valid, false otherwise
 */
export function isValidAIModelId(value: string): value is AIModelId {
  return AI_MODEL_IDS.has(value);
}
