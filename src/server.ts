import { Hono } from "hono"
import { cors } from "hono/cors"
import { logger } from "hono/logger"

import { chatCompletionRoutes } from "./routes/chat-completions/route"
import { messagesRoutes } from "./routes/messages/route"
import { modelRoutes } from "./routes/models/route"

export const server = new Hono()

server.use(logger())
server.use(cors())

server.get("/", (c) => c.text("Server running"))

server.route("/chat/completions", chatCompletionRoutes)
server.route("/models", modelRoutes)

// Compatibility with tools that expect v1/ prefix
server.route("/v1/chat/completions", chatCompletionRoutes)
server.route("/v1/models", modelRoutes)

// Anthropic compatibility
server.route("/v1/messages", messagesRoutes)
server.post("/v1/messages/count_tokens", (c) => c.json({ input_tokens: 1 }))
