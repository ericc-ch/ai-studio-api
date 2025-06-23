/* eslint-disable max-lines */
import type { Locator, Page } from "playwright"

import consola from "consola"
import crypto from "node:crypto"
import { expect } from "playwright/test"
import invariant from "tiny-invariant"

import { LOCATORS } from "~/lib/locators"
import { buildPrompt } from "~/lib/prompt"
import { state } from "~/lib/state"
import { findAsync, sleep } from "~/lib/utils"

import type {
  ChatCompletionChunk,
  ChatCompletionResponse,
  ChatCompletionsPayload,
  ToolCall,
} from "./types"

export const createChatCompletions = async (
  payload: ChatCompletionsPayload,
) => {
  const { page } = state
  invariant(page, "Browser page is not initialized")

  const formattedMessage = buildPrompt(payload.messages, payload.tools)

  await clearChat(page)

  await selectModel(payload.model)
  if (state.json) await enableJSON(page)
  await setTemperature(page, payload.temperature ?? 1)
  await sendMessage(page, formattedMessage)

  await sleep(500)

  await waitForResult(page)

  const result = await getResult(page)

  return payload.stream ?
      buildStreamingResponse(payload, result)
    : buildNonStreamingResponse(payload, result)
}

// Navigation / Automation helpers

const selectModel = async (model: string) => {
  const { page } = state
  invariant(page, "Browser page is not initialized")

  const modelSelector = page.locator(LOCATORS.MODEL_SELECTOR)
  await modelSelector.click()

  const modelOptions = await page.locator(LOCATORS.MODEL_OPTION_ID).all()

  const selectedModel = await findAsync(
    modelOptions,
    async (item) => (await item.textContent())?.trim() === model,
  )
  invariant(selectedModel, `Model not found for :${model}`)

  await selectedModel.click()
}

const sendMessage = async (page: Page, message: string) => {
  const textarea = page.locator(LOCATORS.PROMPT_TEXTAREA)
  await textarea.focus()

  // Copy to clipboard
  await page.evaluate(async (text) => {
    await navigator.clipboard.writeText(text)
  }, message)

  // Paste from clipboard
  await page.keyboard.down("Control")
  await page.keyboard.press("V")
  await page.keyboard.up("Control")

  // Use Control + Enter to send the message
  await page.keyboard.down("Control")
  await page.keyboard.press("Enter")
  await page.keyboard.up("Control")
}

const enableJSON = async (page: Page) => {
  const jsonButton = page.locator(LOCATORS.JSON_MODE)
  if ((await jsonButton.getAttribute("aria-checked")) === "true") return

  await jsonButton.click()
}

const setTemperature = async (page: Page, temperature: number) => {
  const slider = page.locator(LOCATORS.TEMPERATURE_SLIDER)
  await slider.fill(roundTemperature(temperature))
}

const waitForResult = async (page: Page) => {
  const stopButton = page.getByRole("button").filter({ hasText: "Stop" })

  let sleepDuration = 100
  const maxSleepDuration = 10_000

  // LMAO what is this
  while (await locatorVisible(stopButton)) {
    consola.debug(`Stop button is visible, waiting for ${sleepDuration}ms`)
    await sleep(sleepDuration)
    sleepDuration = Math.min(sleepDuration * 2, maxSleepDuration)
  }
}

const getResult = async (page: Page) => {
  const chatTurn = page.locator("ms-chat-turn").last()
  await chatTurn.hover()
  const turnOptions = chatTurn.locator("ms-chat-turn-options")
  await turnOptions.click()

  const copyMarkdown = page.getByText("Copy markdown").last()
  await copyMarkdown.click()

  const response = await page.evaluate(() => navigator.clipboard.readText())
  invariant(response, "No response found")

  return response
}

const clearChat = async (page: Page) => {
  const button = page.locator('button[aria-label="Clear chat"]')
  if (await button.isDisabled()) return
  await button.click()

  await sleep(1000)

  const continueButton = page
    .getByRole("button")
    .filter({ hasText: "Continue" })

  await continueButton.click()
}

const locatorVisible = async (locator: Locator) => {
  try {
    await expect(locator).toBeVisible({ timeout: 100 })
    return true
  } catch {
    return false
  }
}

function roundTemperature(num: number) {
  const roundedNumber = Math.round(num / 0.05) * 0.05
  const formattedString = roundedNumber.toFixed(2)

  return formattedString
}

function parseToolCalls(
  result: string,
): { tool_calls: Array<ToolCall> } | null {
  let jsonString: string | undefined

  if (state.json) {
    jsonString = result
  } else {
    const toolCallRegex = /```json([\s\S]*?)```/
    const match = result.match(toolCallRegex)
    jsonString = match?.[1]
  }

  if (!jsonString) {
    return null
  }

  try {
    const json = JSON.parse(jsonString) as {
      tool_calls?: Array<{ name: string; arguments: unknown }>
    }

    if (Array.isArray(json.tool_calls)) {
      const tool_calls = json.tool_calls.map((tc) => ({
        id: `call_${crypto.randomUUID()}`,
        type: "function" as const,
        function: {
          name: tc.name,
          arguments: JSON.stringify(tc.arguments),
        },
      }))
      return { tool_calls }
    }
    return null
  } catch (error) {
    consola.debug("Failed to parse tool call JSON", error)
    return null
  }
}

// eslint-disable-next-line max-lines-per-function
const buildNonStreamingResponse = (
  payload: ChatCompletionsPayload,
  result: string,
) => {
  consola.debug("Building non-streaming response for result")

  const toolCallData = parseToolCalls(result)

  let content: string | null = result
  if (state.json && !toolCallData) {
    try {
      const json = JSON.parse(result) as { content?: string | null }
      content = json.content ?? null
    } catch (error) {
      consola.debug("Failed to parse content from JSON response", error)
      content = null
    }
  }

  const response: ChatCompletionResponse = {
    id: crypto.randomUUID(),
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: payload.model,
    choices: [
      toolCallData ?
        {
          finish_reason: "tool_calls",
          index: 0,
          logprobs: null,
          message: {
            content: null,
            role: "assistant",
            tool_calls: toolCallData.tool_calls,
          },
        }
      : {
          finish_reason: "stop",
          index: 0,
          logprobs: null,
          message: {
            content: content,
            role: "assistant",
          },
        },
    ],
    system_fingerprint: "fp_mock_fingerprint",
    usage: {
      prompt_tokens: 0, // MOCKED
      completion_tokens: 0, // MOCKED
      total_tokens: 0, // MOCKED
    },
  }

  consola.debug(
    "Non-streaming response built:",
    toolCallData ?
      `${toolCallData.tool_calls.length} tool calls`
    : `${response.choices[0].message.content?.slice(-50)} (Last 50 characters)`,
  )
  return response
}

// eslint-disable-next-line max-lines-per-function
const buildStreamingResponse = (
  payload: ChatCompletionsPayload,
  result: string,
) => {
  consola.debug("Building streaming response for result")

  const toolCallData = parseToolCalls(result)
  if (toolCallData) {
    return buildToolCallStreamingResponse(payload, toolCallData.tool_calls)
  }

  let content = result
  if (state.json) {
    try {
      const json = JSON.parse(result) as { content?: string }
      content = json.content ?? ""
    } catch (error) {
      consola.debug(
        "Failed to parse content from JSON response for streaming",
        error,
      )
      content = ""
    }
  }

  const stringChunks = fakeChunk(content)
  const randomId = crypto.randomUUID()
  const now = Math.floor(Date.now() / 1000)
  const system_fingerprint = "fp_mock_fingerprint"

  const initialChunk: ChatCompletionChunk = {
    id: randomId,
    object: "chat.completion.chunk",
    created: now,
    model: payload.model,
    system_fingerprint,
    choices: [
      {
        index: 0,
        delta: { role: "assistant" },
        logprobs: null,
        finish_reason: null,
      },
    ],
  }

  const completionChunks: Array<ChatCompletionChunk> = stringChunks.map(
    (chunk) => ({
      id: randomId,
      object: "chat.completion.chunk",
      created: now,
      model: payload.model,
      system_fingerprint,
      choices: [
        {
          delta: { content: chunk },
          index: 0,
          finish_reason: null,
          logprobs: null,
        },
      ],
    }),
  )

  const finalChunk: ChatCompletionChunk = {
    id: randomId,
    object: "chat.completion.chunk",
    created: now,
    model: payload.model,
    system_fingerprint,
    choices: [
      {
        index: 0,
        delta: {},
        logprobs: null,
        finish_reason: "stop",
      },
    ],
  }

  const allChunks = [initialChunk, ...completionChunks, finalChunk]

  consola.debug(`Streaming response built: ${allChunks.length} chunks`)
  return allChunks
}

// eslint-disable-next-line max-lines-per-function
function buildToolCallStreamingResponse(
  payload: ChatCompletionsPayload,
  tool_calls: Array<ToolCall>,
) {
  const randomId = crypto.randomUUID()
  const now = Math.floor(Date.now() / 1000)
  const system_fingerprint = "fp_mock_fingerprint"

  const initialChunk: ChatCompletionChunk = {
    id: randomId,
    object: "chat.completion.chunk",
    created: now,
    model: payload.model,
    system_fingerprint,
    choices: [
      {
        index: 0,
        delta: { role: "assistant", content: null },
        logprobs: null,
        finish_reason: null,
      },
    ],
  }

  const toolCallChunks: Array<ChatCompletionChunk> = []
  for (const [index, tool_call] of tool_calls.entries()) {
    // Chunk for the tool call structure with name
    toolCallChunks.push({
      id: randomId,
      object: "chat.completion.chunk",
      created: now,
      model: payload.model,
      system_fingerprint,
      choices: [
        {
          index: 0,
          delta: {
            tool_calls: [
              {
                index,
                id: tool_call.id,
                type: "function",
                function: { name: tool_call.function.name, arguments: "" },
              },
            ],
          },
          logprobs: null,
          finish_reason: null,
        },
      ],
    })

    // Chunk for the arguments
    const argumentChunks = fakeChunk(tool_call.function.arguments)
    for (const argChunk of argumentChunks) {
      toolCallChunks.push({
        id: randomId,
        object: "chat.completion.chunk",
        created: now,
        model: payload.model,
        system_fingerprint,
        choices: [
          {
            index: 0,
            delta: {
              tool_calls: [
                {
                  index,
                  function: { arguments: argChunk },
                },
              ],
            },
            logprobs: null,
            finish_reason: null,
          },
        ],
      })
    }
  }

  const finalChunk: ChatCompletionChunk = {
    id: randomId,
    object: "chat.completion.chunk",
    created: now,
    model: payload.model,
    system_fingerprint,
    choices: [
      {
        index: 0,
        delta: {},
        logprobs: null,
        finish_reason: "tool_calls",
      },
    ],
  }

  const allChunks = [initialChunk, ...toolCallChunks, finalChunk]
  consola.debug(
    `Streaming tool call response built: ${allChunks.length} chunks`,
  )
  return allChunks
}

// eslint-disable-next-line max-lines-per-function
export function buildFakeStreamingResponse(
  model: string,
  content: string,
): Array<ChatCompletionChunk> {
  consola.debug("Building fake streaming response")

  const stringChunks = fakeChunk(content)
  const randomId = crypto.randomUUID()
  const now = Math.floor(Date.now() / 1000)
  const system_fingerprint = "fp_mock_fingerprint"

  const initialChunk: ChatCompletionChunk = {
    id: randomId,
    object: "chat.completion.chunk",
    created: now,
    model: model,
    system_fingerprint,
    choices: [
      {
        index: 0,
        delta: { role: "assistant" },
        logprobs: null,
        finish_reason: null,
      },
    ],
  }

  const completionChunks: Array<ChatCompletionChunk> = stringChunks.map(
    (chunk) => ({
      id: randomId,
      object: "chat.completion.chunk",
      created: now,
      model: model,
      system_fingerprint,
      choices: [
        {
          delta: { content: chunk },
          index: 0,
          finish_reason: null,
          logprobs: null,
        },
      ],
    }),
  )

  const finalChunk: ChatCompletionChunk = {
    id: randomId,
    object: "chat.completion.chunk",
    created: now,
    model: model,
    system_fingerprint,
    choices: [
      {
        index: 0,
        delta: {},
        logprobs: null,
        finish_reason: "stop",
      },
    ],
  }

  const allChunks = [initialChunk, ...completionChunks, finalChunk]

  consola.debug(`Fake streaming response built: ${allChunks.length} chunks`)
  return allChunks
}

export function buildFakeNonStreamingResponse(
  model: string,
  content: string,
): ChatCompletionResponse {
  consola.debug("Building fake non-streaming response")

  const response: ChatCompletionResponse = {
    id: crypto.randomUUID(),
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: model,
    choices: [
      {
        finish_reason: "stop",
        index: 0,
        logprobs: null,
        message: {
          content: content,
          role: "assistant",
        },
      },
    ],
    system_fingerprint: "fp_mock_fingerprint",
    usage: {
      prompt_tokens: 0, // MOCKED
      completion_tokens: 0, // MOCKED
      total_tokens: 0, // MOCKED
    },
  }

  consola.debug(
    "Fake non-streaming response built:",
    `${response.choices[0].message.content?.slice(-50)} (Last 50 characters)`,
  )
  return response
}

function fakeChunk(content: string) {
  const chunks: Array<string> = []
  if (!content) {
    return chunks
  }
  for (let i = 0; i < content.length; i += 5) {
    chunks.push(content.slice(i, i + 5))
  }
  return chunks
}
