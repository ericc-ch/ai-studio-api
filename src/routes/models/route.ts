import { Hono } from "hono"

import { forwardError } from "~/lib/error"
import { state } from "~/lib/state"

export const modelRoutes = new Hono()

modelRoutes.get("/", async (c) => {
  try {
    return c.json(state.models)
  } catch (error) {
    return await forwardError(c, error)
  }
})
