import type { Page } from "playwright"

import type { ExpectedModels } from "~/services/get-models"

export interface State {
  page?: Page

  models?: ExpectedModels

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
