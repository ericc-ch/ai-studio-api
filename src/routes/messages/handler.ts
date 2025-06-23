import type { Context } from "hono"

import consola from "consola"
import { streamSSE } from "hono/streaming"

import type { ChatCompletionResponse } from "~/services/types"

import { checkRateLimit } from "~/lib/rate-limit"
import { state } from "~/lib/state"
import { awaitApproval } from "~/lib/utils"
import { createChatCompletions } from "~/services/create-chat-completions"

import {
  type AnthropicMessagesPayload,
  type AnthropicStreamState,
} from "./anthropic-types"
import {
  translateToAnthropic,
  translateToOpenAI,
} from "./non-stream-translation"
import { translateChunkToAnthropicEvents } from "./stream-translation"

type ChatCompletionsPromise = PromiseWithResolvers<
  Awaited<ReturnType<typeof createChatCompletions>>
>

const isNonStreaming = (
  response: Awaited<ReturnType<typeof createChatCompletions>>,
): response is ChatCompletionResponse => Object.hasOwn(response, "choices")

function handleStreamingResponse(c: Context, promise: ChatCompletionsPromise) {
  return streamSSE(c, async (stream) => {
    const pingInterval = setInterval(() => {
      consola.debug("Sending ping while waiting for completion to start")
      void stream.writeSSE({
        event: "ping",
        data: JSON.stringify({ type: "ping" }),
      })
    }, 3000)

    const response = await promise.promise
    clearInterval(pingInterval)

    if (isNonStreaming(response)) {
      consola.error(
        "Expected a streaming response but got a non-streaming one.",
      )
      return
    }

    const streamState: AnthropicStreamState = {
      messageStartSent: false,
      contentBlockIndex: 0,
      contentBlockOpen: false,
      toolCalls: {},
    }

    for (const chunk of response) {
      const events = translateChunkToAnthropicEvents(chunk, streamState)

      for (const event of events) {
        consola.debug("Translated Anthropic event:", JSON.stringify(event))
        await stream.writeSSE({
          event: event.type,
          data: JSON.stringify(event),
        })
      }
    }
  })
}

async function handleNonStreamingResponse(
  c: Context,
  promise: ChatCompletionsPromise,
) {
  const response = await promise.promise

  if (isNonStreaming(response)) {
    const anthropicResponse = translateToAnthropic(response)
    consola.debug(
      "Translated Anthropic response:",
      JSON.stringify(anthropicResponse),
    )
    return c.json(anthropicResponse)
  }

  consola.error("Received a streaming response for a non-streaming request.")
}

export async function handleMessages(c: Context) {
  await checkRateLimit(state)
  if (state.manualApprove) {
    await awaitApproval()
  }

  const promise =
    Promise.withResolvers<Awaited<ReturnType<typeof createChatCompletions>>>()

  const anthropicPayload = await c.req.json<AnthropicMessagesPayload>()
  consola.debug(
    "Anthropic request payload:",
    JSON.stringify(anthropicPayload).slice(-400),
  )

  const openAIPayload = translateToOpenAI(anthropicPayload)
  consola.debug(
    "Translated OpenAI request payload:",
    JSON.stringify(openAIPayload).slice(-400),
  )

  state.requestQueue.push({ payload: openAIPayload, promise })

  if (anthropicPayload.stream) {
    return handleStreamingResponse(c, promise)
  }

  return handleNonStreamingResponse(c, promise)
}
