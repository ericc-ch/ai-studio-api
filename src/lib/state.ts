import type { Page } from "playwright"

import type { ExpectedModels } from "~/services/get-models"
import type {
  ChatCompletionChunk,
  ChatCompletionResponse,
  ChatCompletionsPayload,
} from "~/services/types"

export interface State {
  page?: Page

  models?: ExpectedModels

  manualApprove: boolean
  rateLimitWait: boolean
  json: boolean

  geminiApiKey?: string

  // Rate limiting configuration
  rateLimitSeconds?: number
  lastRequestTimestamp?: number

  // Queue-based processing state
  requestQueue: Array<{
    payload: ChatCompletionsPayload
    promise: PromiseWithResolvers<
      ChatCompletionResponse | Array<ChatCompletionChunk>
    >
  }>
}

export const state: State = {
  manualApprove: false,
  rateLimitWait: false,
  json: false,
  requestQueue: [],
}
