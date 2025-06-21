import { Hono } from "hono"

import { forwardError } from "~/lib/error"

import { handleMessages } from "./handler"

export const messagesRoutes = new Hono()

messagesRoutes.post("/", async (c) => {
  try {
    return await handleMessages(c)
  } catch (error) {
    return await forwardError(c, error)
  }
})
