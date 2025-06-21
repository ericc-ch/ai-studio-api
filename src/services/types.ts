export interface ToolCall {
  id: string
  type: "function"
  function: {
    name: string
    arguments: string
  }
}

export interface ToolCallDelta {
  index: number
  id?: string
  type?: "function"
  function?: {
    name?: string
    arguments?: string
  }
}

// Streaming types

export interface ChatCompletionChunk {
  choices: Array<Choice>
  created: number
  object: "chat.completion.chunk"
  id: string
  model: string
  system_fingerprint?: string
}

export interface Delta {
  content?: string | null
  role?: "assistant"
  tool_calls?: Array<ToolCallDelta>
}

export interface Choice {
  index: number
  delta: Delta
  finish_reason: "stop" | "length" | "tool_calls" | "content_filter" | null
  logprobs: null
}

// Non-streaming types

export interface ChatCompletionResponse {
  id: string
  object: "chat.completion"
  created: number
  model: string
  choices: Array<ChoiceNonStreaming>
  system_fingerprint?: string
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface ChoiceNonStreaming {
  index: number
  message: {
    role: "assistant"
    content: string | null
    tool_calls?: Array<ToolCall>
  }
  logprobs: null
  finish_reason: "stop" | "length" | "tool_calls" | "content_filter"
}

// Payload types

export interface FunctionDescription {
  name: string
  description?: string
  parameters?: object
}

export interface Tool {
  type: "function"
  function: FunctionDescription
}

export interface ChatCompletionsPayload {
  messages: Array<Message>
  model: string
  frequency_penalty?: number
  logit_bias?: Record<string, number>
  logprobs?: boolean
  max_tokens?: number
  n?: number
  presence_penalty?: number
  response_format?: { type: "text" | "json_object" }
  seed?: number
  stop?: string | Array<string>
  stream?: boolean
  temperature?: number
  top_p?: number
  tools?: Array<Tool>
  tool_choice?: string | object
  user?: string
}

export type TextPart = {
  type: "text"
  text: string
}

export type ImagePart = {
  type: "image_url"
  image_url: {
    url: string
    detail?: "low" | "high" | "auto"
  }
}

export type ContentPart = TextPart | ImagePart

export interface Message {
  role: "user" | "assistant" | "system" | "tool" | "developer"
  content: string | Array<ContentPart> | null
  name?: string
  tool_calls?: Array<ToolCall>
  tool_call_id?: string
}

// https://platform.openai.com/docs/api-reference
