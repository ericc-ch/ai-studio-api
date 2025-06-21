import type { Message, Tool } from "~/services/types"

function formatMessages(messages: Array<Message>): string {
  return messages
    .map((message) => {
      // --- Extract content ---
      let content: string
      if (typeof message.content === "string") {
        content = message.content
      } else if (Array.isArray(message.content)) {
        content = message.content
          .filter(
            (part): part is { type: "text"; text: string } =>
              part.type === "text",
          )
          .map((part) => part.text)
          .join("\n")
      } else {
        content = ""
      }

      // --- Format message based on role ---
      if (message.role === "tool") {
        // The content of a tool message is the return value of the function.
        // We put it on a new line for readability.
        return `TOOL (tool_call_id: ${message.tool_call_id}):\n${content}`
      }

      let roleAndContent = `${message.role.toUpperCase()}:`
      if (content) {
        roleAndContent += ` ${content}`
      }

      if (message.role === "assistant" && message.tool_calls) {
        // Add tool calls to assistant messages, nicely formatted.
        const toolCallsString = `\nTOOL_CALLS: ${JSON.stringify(
          message.tool_calls,
          null,
          2,
        )}`
        return roleAndContent + toolCallsString
      }

      return roleAndContent
    })
    .join("\n\n") // Use a double newline to separate messages for clarity
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

// eslint-disable-next-line max-lines-per-function
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

For example, if the user asks for the weather, your response would be a tool call.
The chat history would then be updated with the tool call and the tool's response.
It would look something like this:

USER: What's the weather like in San Francisco?
ASSISTANT:
TOOL_CALLS: [
  {
    "id": "call_1234",
    "type": "function",
    "function": {
      "name": "get_weather",
      "arguments": "{\\"city\\":\\"San Francisco\\"}"
    }
  }
]
TOOL (tool_call_id: call_1234):
{"temperature": "72F", "conditions": "sunny"}

You would then see this new history and respond to the user with the weather information.

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
