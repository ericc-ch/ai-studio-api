import { countTokens } from "gpt-tokenizer/model/gpt-4o"

import type { Message } from "~/services/copilot/create-chat-completions"

export const getTokenCount = (messages: Array<Message>) => {
  const input = messages.filter((m) => m.role !== "assistant")
  const output = messages.filter((m) => m.role === "assistant")

  const inputTokens = countTokens(input)
  const outputTokens = countTokens(output)

  return {
    input: inputTokens,
    output: outputTokens,
  }
}
