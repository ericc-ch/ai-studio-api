import type { Page } from "playwright"

import type { ModelsResponse } from "~/services/copilot/get-models"

export interface State {
  page?: Page

  models?: ModelsResponse

  manualApprove: boolean
  rateLimitWait: boolean

  // Rate limiting configuration
  rateLimitSeconds?: number
  lastRequestTimestamp?: number
}

export const state: State = {
  manualApprove: false,
  rateLimitWait: false,
}
