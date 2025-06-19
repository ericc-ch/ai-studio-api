import type { Message, Tool } from "~/services/create-chat-completions"

function formatMessages(messages: Array<Message>): string {
  let systemMessages = ""
  let otherMessages = ""

  for (const message of messages) {
    let content: string
    if (typeof message.content === "string") {
      content = message.content
    } else if (Array.isArray(message.content)) {
      // For now, just combine text parts. Image parts are ignored.
      content = message.content
        .filter(
          (part): part is { type: "text"; text: string } =>
            part.type === "text",
        )
        .map((part) => part.text)
        .join("\n")
    } else {
      content = "" // Should not happen with correct types
    }

    if (message.role === "system") {
      systemMessages += `${message.role.toUpperCase()}: ${content}\n`
    } else {
      otherMessages += `${message.role.toUpperCase()}: ${content}\n`
    }
  }

  return systemMessages + otherMessages
}

function formatTools(tools: Array<Tool>): string {
  const toolStrings = tools.map((tool) => {
    const { function: func } = tool
    const params =
      func.parameters ?
        JSON.stringify(func.parameters, null, 2)
      : "No parameters"
    return `
Tool: ${func.name}
Description: ${func.description || "No description"}
Parameters (JSON Schema): ${params}
`.trim()
  })
  return toolStrings.join("\n\n")
}

export const buildPrompt = (messages: Array<Message>, tools?: Array<Tool>) => {
  const basePrompt = `
You are an AI assistant.
You have been given a chat history formatted as follows:

SYSTEM: (system instructions for the assistant)
USER: (user message)
ASSISTANT: (assistant message)
... and so on.

Your task is to respond to the very last message in this history that is from the "USER".
Please provide your response as if you are continuing the conversation.

Most importantly, your response should be only the content of your message.
Do not include any prefixes like "ASSISTANT:", "AI:", or anything else. Just the text of your answer.

For example, if the last user message is "What is the capital of France?", your response should be:
"The capital of France is Paris."

Do not write it like this:
"ASSISTANT: The capital of France is Paris."
`.trim()

  let toolInstructions = ""
  if (tools?.length) {
    toolInstructions = `
You have access to the following tools. To use a tool, you MUST respond with a JSON object in the following format inside a \`\`\`json code block:
{
  "tool_calls": [
    {
      "name": "tool_name",
      "arguments": {
        "arg1": "value1",
        "arg2": "value2"
      }
    }
  ]
}

Here are the available tools:
---
${formatTools(tools)}
---
`.trim()
  }

  const chatHistory = `
The following is the chat history:
---
${formatMessages(messages)}
---
`.trim()

  return [basePrompt, toolInstructions, chatHistory]
    .filter(Boolean)
    .join("\n\n")
}
