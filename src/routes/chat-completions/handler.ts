import type { Context } from "hono"

import consola from "consola"
import { proxy } from "hono/proxy"
import { streamSSE } from "hono/streaming"

import type {
  ChatCompletionResponse,
  ChatCompletionsPayload,
} from "~/services/types"

import { state } from "~/lib/state"
import { awaitApproval } from "~/lib/utils"
import { createChatCompletions } from "~/services/create-chat-completions"

export async function handleChatCompletion(c: Context) {
  if (state.manualApprove) await awaitApproval()

  const payload = await c.req.json<ChatCompletionsPayload>()

  if (payload.model.startsWith("proxy-")) {
    const geminiUrl =
      "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"

    consola.debug(`Proxying request for ${payload.model} to ${geminiUrl}`)

    const headers = {
      ...c.req.header(),
      Authorization: `Bearer ${state.geminiApiKey}`,
    }
    delete headers["content-length"]
    delete headers.host

    const body = {
      ...payload,
      model: payload.model.replace("proxy-", ""),
    }

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
