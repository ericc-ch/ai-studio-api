import type { Context } from "hono"

import consola from "consola"
import { proxy } from "hono/proxy"
import { streamSSE } from "hono/streaming"

import type {
  ChatCompletionResponse,
  ChatCompletionsPayload,
} from "~/services/types"

import { RESPONSE_MAP } from "~/lib/cache"
import { state } from "~/lib/state"
import { awaitApproval } from "~/lib/utils"
import {
  buildFakeNonStreamingResponse,
  buildFakeStreamingResponse,
  createChatCompletions,
} from "~/services/create-chat-completions"

// eslint-disable-next-line max-lines-per-function
export async function handleChatCompletion(c: Context) {
  if (state.manualApprove) await awaitApproval()

  const payload = await c.req.json<ChatCompletionsPayload>()

  const systemMessage = payload.messages.find((m) => m.role === "system")
  if (
    systemMessage
    && typeof systemMessage.content === "string"
    && RESPONSE_MAP.has(systemMessage.content)
  ) {
    consola.debug("Cache hit on system message, using fake response")
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const responseGenerator = RESPONSE_MAP.get(systemMessage.content)!
    const content = responseGenerator()

    if (payload.stream) {
      const chunks = buildFakeStreamingResponse(payload.model, content)
      return streamSSE(c, async (stream) => {
        for (const chunk of chunks) {
          await stream.writeSSE({
            data: JSON.stringify(chunk),
          })
        }
      })
    }

    const response = buildFakeNonStreamingResponse(payload.model, content)
    return c.json(response)
  }

  if (payload.model.startsWith("proxy-")) {
    const geminiUrl =
      "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"

    consola.debug(`Proxying request for ${payload.model} to ${geminiUrl}`)

    const headers: Record<string, string> = {
      ...c.req.header(),
      Authorization: `Bearer ${state.geminiApiKey}`,
    }
    delete headers["content-length"]
    delete headers.host

    const body = {
      ...payload,
      model: payload.model.replace("proxy-", ""),
    }

    consola.debug("Proxying body:", JSON.stringify(body).slice(-400))

    return proxy(geminiUrl, {
      method: c.req.method,
      headers,
      body: JSON.stringify(body),
    })
  }

  const promise =
    Promise.withResolvers<Awaited<ReturnType<typeof createChatCompletions>>>()

  state.requestQueue.push({ payload, promise })

  const response = await promise.promise

  if (isNonStreaming(response)) {
    return c.json(response)
  }

  return streamSSE(c, async (stream) => {
    for (const chunk of response) {
      await stream.writeSSE({
        data: JSON.stringify(chunk),
      })
    }
  })
}

const isNonStreaming = (
  response: Awaited<ReturnType<typeof createChatCompletions>>,
): response is ChatCompletionResponse => !Array.isArray(response)
