import type { Page } from "playwright"

import type {
  ChatCompletionChunk,
  ChatCompletionResponse,
  ChatCompletionsPayload,
} from "~/services/create-chat-completions"
import type { ExpectedModels } from "~/services/get-models"

export interface State {
  page?: Page

  models?: ExpectedModels

  manualApprove: boolean
  rateLimitWait: boolean

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
  requestQueue: [],
}
