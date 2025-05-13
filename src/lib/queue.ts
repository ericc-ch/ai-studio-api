import consola from "consola"

import { createChatCompletions } from "~/services/create-chat-completions"

import { sleep } from "./sleep"
import { state } from "./state"

export async function processQueue() {
  consola.debug("Starting processQueue loop")
  while (true) {
    if (state.requestQueue.length <= 0) {
      consola.debug("Request queue is empty, sleeping")
      await sleep(100)
      continue
    }

    consola.debug(
      `Processing task from queue. Queue length: ${state.requestQueue.length}`,
    )
    const task = state.requestQueue.shift()
    // Shouldn't be possible but just in case
    if (!task) {
      consola.debug("Shifted task is undefined, continuing")
      continue
    }

    consola.debug("Creating chat completions for task:", task.payload)
    const response = await createChatCompletions(task.payload)
    task.promise.resolve(response)
    consola.debug("Task processed and promise resolved")
  }
}
