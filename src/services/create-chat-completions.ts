import type { Locator, Page } from "playwright"

import consola from "consola"
import crypto from "node:crypto"
import { expect } from "playwright/test"
import invariant from "tiny-invariant"

import { buildPrompt } from "~/lib/prompt"
import { sleep } from "~/lib/sleep"
import { state } from "~/lib/state"

export const createChatCompletions = async (
  payload: ChatCompletionsPayload,
) => {
  const { page } = state
  invariant(page, "Browser page is not initialized")

  const formattedMessage = buildPrompt(payload.messages)

  await clearChat(page)

  await selectModel(payload.model)
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

  const modelSelector = page.locator("ms-run-settings ms-model-selector")
  await modelSelector.click()

  const modelOption = page.locator("mat-option").filter({ hasText: model })
  await modelOption.click()
}

const sendMessage = async (page: Page, message: string) => {
  const textarea = page.locator(
    'textarea[aria-label="Type something or pick one from prompt gallery"]',
  )
  await textarea.fill(message)
  await page.keyboard.down("Control")
  await page.keyboard.press("Enter")
  await page.keyboard.up("Control")
}

const setTemperature = async (page: Page, temperature: number) => {
  const temperatureSelector =
    'div[data-test-id="temperatureSliderContainer"] input[type="number"]'

  const tempElement = page.locator(temperatureSelector)
  await tempElement.fill(roundTemperature(temperature))
}

const waitForResult = async (page: Page) => {
  const stopButton = page.getByRole("button").filter({ hasText: "Stop" })

  // LMAO what is this
  while (await locatorVisible(stopButton)) {
    consola.debug("waitForResult: Stop button is visible")
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

const buildNonStreamingResponse = (
  payload: ChatCompletionsPayload,
  result: string,
) => {
  consola.debug("Building non-streaming response for result")
  const response: ChatCompletionResponse = {
    id: crypto.randomUUID(),
    object: "chat.completion",
    created: Date.now(),
    model: payload.model,
    choices: [
      {
        finish_reason: "stop",
        index: 0,
        logprobs: null,
        message: {
          content: result,
          role: "assistant",
        },
      },
    ],
  }

  consola.debug("Non-streaming response built:", response)
  return response
}

const buildStreamingResponse = (
  payload: ChatCompletionsPayload,
  result: string,
) => {
  consola.debug("Building streaming response for result")
  const stringChunks = fakeChunk(result)
  const randomId = crypto.randomUUID()
  const now = Date.now()

  const completionChunks: Array<ChatCompletionChunk> = stringChunks.map(
    (chunk) => ({
      choices: [
        {
          delta: { content: chunk },
          index: 0,
          finish_reason: null,
          logprobs: null,
        },
      ],
      created: now,
      object: "chat.completion.chunk",
      id: randomId,
      model: payload.model,
    }),
  )

  consola.debug(`Streaming response built: ${completionChunks.length} chunks`)
  return completionChunks
}

function fakeChunk(content: string) {
  const chunks: Array<string> = []
  for (let i = 0; i < content.length; i += 5) {
    chunks.push(content.slice(i, i + 5))
  }
  return chunks
}

// Streaming types

export interface ChatCompletionChunk {
  choices: [Choice]
  created: number
  object: "chat.completion.chunk"
  id: string
  model: string
}

interface Delta {
  content?: string
  role?: string
}

interface Choice {
  index: number
  delta: Delta
  finish_reason: "stop" | null
  logprobs: null
}

// Non-streaming types

export interface ChatCompletionResponse {
  id: string
  object: string
  created: number
  model: string
  choices: [ChoiceNonStreaming]
}

interface ChoiceNonStreaming {
  index: number
  message: Message
  logprobs: null
  finish_reason: "stop"
}

// Payload types

export interface ChatCompletionsPayload {
  messages: Array<Message>
  model: string
  temperature?: number
  top_p?: number
  max_tokens?: number
  stop?: Array<string>
  n?: number
  stream?: boolean
}

export interface Message {
  role: "user" | "assistant" | "system"
  content: string
}

// https://platform.openai.com/docs/api-reference
