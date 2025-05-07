import type { Message } from "~/services/copilot/create-chat-completions"

function formatMessages(messages: Array<Message>): string {
  let systemMessages = ""
  let otherMessages = ""

  for (const message of messages) {
    if (message.role === "system") {
      systemMessages += `${message.role.toUpperCase()}: ${message.content}\n`
    } else {
      otherMessages += `${message.role.toUpperCase()}: ${message.content}\n`
    }
  }

  return systemMessages + otherMessages
}

export const buildPrompt = (messages: Array<Message>) =>
  `
You are an AI assistant.
You have been given a chat history formatted as follows:

SYSTEM: [system instructions for the assistant]
USER: [user message]
ASSISTANT: [assistant message]
... and so on.

Your task is to respond to the very last message in this history that is from the "USER".
Please provide your response as if you are continuing the conversation.

Most importantly, your response should be only the content of your message.
Do not include any prefixes like "ASSISTANT:", "AI:", or anything else. Just the text of your answer.

For example, if the last user message is "What is the capital of France?", your response should be:
"The capital of France is Paris."

Do not write it like this:
"ASSISTANT: The capital of France is Paris."

The following is the chat history:
---
${formatMessages(messages)}
---
`.trim()
