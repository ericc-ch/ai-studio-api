import consola from "consola"

import { getModels } from "~/services/get-models"

import { HTTPError } from "./error"
import { state } from "./state"

export const awaitApproval = async () => {
  const response = await consola.prompt(`Accept incoming request?`, {
    type: "confirm",
  })

  if (!response)
    throw new HTTPError(
      "Request rejected",
      Response.json({ message: "Request rejected" }, { status: 403 }),
    )
}

export async function findAsync<T>(
  array: Array<T>,
  predicate: (item: T) => Promise<boolean>,
) {
  const promises = array.map((element) => predicate(element))
  const results = await Promise.all(promises)
  const index = results.indexOf(true)

  return index === -1 ? undefined : array[index]
}

export const sleep = (ms: number) =>
  new Promise((resolve) => {
    setTimeout(resolve, ms)
  })

export async function cacheModels(): Promise<void> {
  const models = await getModels()
  state.models = models

  consola.info(
    `Available models: \n${models.data.map((model) => `- ${model.id}`).join("\n")}`,
  )
}
