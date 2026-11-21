/** gpt-oss on Workers AI cannot turn reasoning off; keep it short so replies fit max_tokens. */
export function gptOssReasoningOptions(
  model: string,
): { reasoning_effort: "low" } | Record<string, never> {
  return String(model).startsWith("@cf/openai/gpt-oss-")
    ? { reasoning_effort: "low" }
    : {};
}
