import consola from "consola"

import { getModels } from "~/services/copilot/get-models"

import { state } from "./state"

export async function cacheModels(): Promise<void> {
  const models = await getModels()
  state.models = models

  consola.info(
    `Available models: \n${models.data.map((model) => `- ${model.id}`).join("\n")}`,
  )
}
