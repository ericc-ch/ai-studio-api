import type { Context } from "hono"

import consola from "consola"
import { proxy } from "hono/proxy"
import { streamSSE } from "hono/streaming"

import type { ChatCompletionResponse } from "~/services/types"

import { RESPONSE_MAP } from "~/lib/cache"
import { state } from "~/lib/state"
import { awaitApproval } from "~/lib/utils"
import {
  buildFakeNonStreamingResponse,
  buildFakeStreamingResponse,
  createChatCompletions,
} from "~/services/create-chat-completions"

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
  if (state.manualApprove) {
    await awaitApproval()
  }

  const anthropicPayload = await c.req.json<AnthropicMessagesPayload>()
  consola.debug(
    "Anthropic request payload:",
    JSON.stringify(anthropicPayload).slice(-400),
  )

  if (anthropicPayload.system) {
    const systemContent =
      typeof anthropicPayload.system === "string" ?
        anthropicPayload.system
      : anthropicPayload.system.map((s) => s.text).join("\n")

    if (RESPONSE_MAP.has(systemContent)) {
      consola.debug("Cache hit on system message, using fake response")
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const responseGenerator = RESPONSE_MAP.get(systemContent)!
      const content = responseGenerator()

      const promise =
        Promise.withResolvers<
          Awaited<ReturnType<typeof createChatCompletions>>
        >()

      if (anthropicPayload.stream) {
        const chunks = buildFakeStreamingResponse(
          anthropicPayload.model,
          content,
        )
        promise.resolve(chunks)
        return handleStreamingResponse(c, promise)
      }

      const response = buildFakeNonStreamingResponse(
        anthropicPayload.model,
        content,
      )
      promise.resolve(response)
      return handleNonStreamingResponse(c, promise)
    }
  }

  const openAIPayload = translateToOpenAI(anthropicPayload)
  consola.debug(
    "Translated OpenAI request payload:",
    JSON.stringify(openAIPayload).slice(-400),
  )

  if (openAIPayload.model.startsWith("proxy-")) {
    const geminiUrl =
      "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"

    consola.debug(`Proxying request for ${openAIPayload.model} to ${geminiUrl}`)

    const headers: Record<string, string> = {
      ...c.req.header(),
      Authorization: `Bearer ${state.geminiApiKey}`,
    }
    delete headers["content-length"]
    delete headers.host

    const body = {
      ...openAIPayload,
      model: openAIPayload.model.replace("proxy-", ""),
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

  state.requestQueue.push({ payload: openAIPayload, promise })

  if (anthropicPayload.stream) {
    return handleStreamingResponse(c, promise)
  }

  return handleNonStreamingResponse(c, promise)
}
