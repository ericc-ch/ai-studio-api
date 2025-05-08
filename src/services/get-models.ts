import invariant from "tiny-invariant"

import { getDocument } from "~/lib/dom"
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

  const modelSelector = page.locator("ms-run-settings ms-model-selector")
  await modelSelector.click()

  const document = await getDocument(page)
  const options = document.querySelectorAll("mat-option")

  const modelText = Array.from(options)
    .map((option) => option.textContent)
    .filter((item): item is string => item !== null)
  const models = modelText.map((element) => parseModel(element))

  const expected: ExpectedModels = {
    object: "list",
    data: models.map((model) => ({
      id: model.name,
      object: "model",
      created: Date.now(),
      owned_by: "google",
    })),
  }

  const modelOption = page.locator("mat-option").first()
  await modelOption.click()

  return expected
}

export const selectModel = async (model: string) => {
  const { page } = state
  invariant(page, "Browser page is not initialized")

  const modelSelector = page.locator("ms-run-settings ms-model-selector")
  await modelSelector.click()

  const modelOption = page.locator("mat-option").filter({ hasText: model })
  await modelOption.click()
}

interface Model {
  id: string
  object: "model"
  created: number
  owned_by: string
}

export interface ExpectedModels {
  object: "list"
  data: Array<Model>
}
