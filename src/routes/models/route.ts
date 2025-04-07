import { Hono } from "hono"

import { forwardError } from "~/lib/forward-error"
import { getModels } from "~/services/copilot/get-models"

export const modelRoutes = new Hono()

modelRoutes.get("/", async (c) => {
  try {
    const models = await getModels()
    return c.json(models)
  } catch (error) {
    return await forwardError(c, error)
  }
})
