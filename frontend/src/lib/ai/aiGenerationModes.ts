import type { AIGenerationMode, AIGenerationModeOptionVm } from "./aiTypes";

/**
 * Default AI generation mode
 */
export const DEFAULT_AI_GENERATION_MODE: AIGenerationMode = "KNOWLEDGE_ASSIMILATION";

/**
 * Available AI generation modes for selection
 */
export const AI_GENERATION_MODE_OPTIONS: AIGenerationModeOptionVm[] = [
  { value: "KNOWLEDGE_ASSIMILATION", label: "Przyswajanie wiedzy" },
  { value: "LANGUAGE_A1", label: "Nauka języka (A1)" },
  { value: "LANGUAGE_A2", label: "Nauka języka (A2)" },
  { value: "LANGUAGE_B1", label: "Nauka języka (B1)" },
  { value: "LANGUAGE_B2", label: "Nauka języka (B2)" },
  { value: "LANGUAGE_C1", label: "Nauka języka (C1)" },
  { value: "LANGUAGE_C2", label: "Nauka języka (C2)" },
];

/**
 * Set of valid AI generation mode values for quick validation
 */
export const AI_GENERATION_MODE_VALUES = new Set<string>(
  AI_GENERATION_MODE_OPTIONS.map((opt) => opt.value)
);

/**
 * Validates if a string is a valid AI generation mode
 * @param value - The value to validate
 * @returns true if valid, false otherwise
 */
export function isValidAIGenerationMode(value: string): value is AIGenerationMode {
  return AI_GENERATION_MODE_VALUES.has(value);
}
