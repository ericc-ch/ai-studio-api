import invariant from "tiny-invariant"

import { getDocument } from "~/lib/dom"
import { LOCATORS } from "~/lib/locators"
import { state } from "~/lib/state"

const parseModel = (data: string) => {
  const trimmed = data.trim()
  const parts = trimmed.split(" ")

  const name = parts.pop() ?? ""
  const label = parts.join(" ")
  return { label, name }
}

export async function getModels() {
  const { page } = state
  invariant(page, "Browser page is not initialized")

  const modelSelector = page.locator(LOCATORS.MODEL_SELECTOR)
  await modelSelector.click()

  const document = await getDocument(page)
  const options = document.querySelectorAll("mat-option")

  const modelText = Array.from(options)
    .map((option) => option.textContent)
    .filter((item): item is string => item !== null)
  const models = modelText.map((element) => parseModel(element))

  const now = new Date()

  const expected: ExpectedModels = {
    object: "list",
    data: models.map((model) => {
      return {
        id: model.name,
        object: "model",
        type: "model",
        created: Math.floor(now.getTime() / 1000),
        created_at: now.toISOString(),
        owned_by: "google",
        display_name: model.label,
      }
    }),
    has_more: false,
  }

  if (state.geminiApiKey)
    expected.data.push(
      {
        id: "proxy-gemini-2.5-flash",
        object: "model",
        type: "model",
        created: Math.floor(now.getTime() / 1000),
        created_at: now.toISOString(),
        owned_by: "google",
        display_name: "Gemini 2.5 Flash",
      },
      {
        id: "proxy-gemini-2.5-flash-lite-preview-06-17",
        object: "model",
        type: "model",
        created: Math.floor(now.getTime() / 1000),
        created_at: now.toISOString(),
        owned_by: "google",
        display_name: "Gemini 2.5 Flash Lite Preview 06-17",
      },
    )

  const modelOption = page.locator("mat-option").first()
  await modelOption.click()

  return expected
}

interface Model {
  id: string
  object: "model"
  type: "model"
  created: number
  created_at: string
  owned_by: string
  display_name: string
}

export interface ExpectedModels {
  object: "list"
  data: Array<Model>
  has_more: boolean
}
