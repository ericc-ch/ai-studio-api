import type { Message, Tool } from "~/services/types"

import { state } from "~/lib/state"

function buildJsonPrompt(
  messages: Array<Message>,
  tools?: Array<Tool>,
): string {
  const system_prompt = `You are an AI assistant operating in JSON mode.
Your response MUST be a single, valid JSON object.

If you are just sending a message, the JSON object should have a single key "content" with your response as a string value.
The value of "content" can be a markdown formatted string.
Example:
{
  "content": "Hello! How can I help you today?"
}

If you need to call one or more tools, the JSON object must contain a "tool_calls" key, which is an array of tool call objects.
Each tool call object must have a "name" (the tool name) and "arguments" (an object of parameters).
Example:
{
  "tool_calls": [
    {
      "name": "get_weather",
      "arguments": {
        "city": "San Francisco"
      }
    }
  ]
}

The user's request is provided in the 'messages' array.
Available tools are in the 'tools' array.
Do not add any other text outside of the JSON object in your response.`

  const promptPayload = {
    system_prompt,
    messages,
    tools,
  }

  return JSON.stringify(promptPayload, null, 2)
}

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
  if (state.json) {
    return buildJsonPrompt(messages, tools)
  }

  const basePrompt = `
You are an AI assistant.
You will be given a chat history formatted as follows:

---
SYSTEM: (system instructions for the assistant)
USER: (user message)
ASSISTANT: (assistant message)
---
... and so on.

Follow these instructions when responding to the user:
- Your primary task is to answer the last "USER" message in the chat history.
- Your response must be only the text of your answer.
- Do not include any prefixes like "ASSISTANT:" or "AI:".

Here are some examples of how to respond:

EXAMPLE 1
The following is the chat history:
---
USER: What is the capital of France?
---

Your response:
The capital of France is Paris.


EXAMPLE 2
The following is the chat history:
---
USER: Hi there!
ASSISTANT: Hello! How can I help you today?
USER: Can you write a short haiku about a robot?
---

Your response:
Metal gears now turn,
Circuits hum a soft, low song,
Thinking fills the room.

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
