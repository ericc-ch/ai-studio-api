import type { Context } from "hono"

import { streamSSE } from "hono/streaming"

import type {
  ChatCompletionResponse,
  ChatCompletionsPayload,
} from "~/services/types"

import { awaitApproval } from "~/lib/approval"
import { checkRateLimit } from "~/lib/rate-limit"
import { state } from "~/lib/state"
import { createChatCompletions } from "~/services/create-chat-completions"

export async function handleCompletion(c: Context) {
  await checkRateLimit(state)
  if (state.manualApprove) await awaitApproval()

  const promise =
    Promise.withResolvers<Awaited<ReturnType<typeof createChatCompletions>>>()
  const payload = await c.req.json<ChatCompletionsPayload>()

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
