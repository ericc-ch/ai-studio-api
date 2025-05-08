import type { Locator, Page } from "playwright"

import { JSDOM } from "jsdom"
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

  await selectModel(payload.model)
  await setTemperature(page, payload.temperature ?? 1)
  await sendMessage(page, formattedMessage)

  await sleep(1000)

  await waitForResult(page)

  // Sleeping here because sometimes the stop button updates earlier
  await sleep(2500)

  const result = await parseResult(page)
  await clearChat(page)

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

  while (await locatorVisible(stopButton)) {
    await sleep(500)
    console.log("Stop button is visible")
  }
}

const parseResult = async (page: Page) => {
  const pageHTML: string = await page.evaluate(() => document.body.innerHTML)
  const dom = new JSDOM(pageHTML)
  const document = dom.window.document

  const chatContainer = document.querySelector("ms-chat-session")
  invariant(chatContainer, "No chat container found")

  const chatTurns = chatContainer.querySelectorAll("ms-chat-turn")
  const lastChatTurn = Array.from(chatTurns).at(-1)
  invariant(lastChatTurn, "No last chat turn found")

  const textChunk = lastChatTurn.querySelector("ms-text-chunk")
  invariant(textChunk, "No text chunk found")

  const result = textChunk.textContent
  invariant(result, "No result found")

  return result
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
    await expect(locator).toBeVisible({ timeout: 1000 })
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

  return response
}

const buildStreamingResponse = (
  payload: ChatCompletionsPayload,
  result: string,
) => {
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
