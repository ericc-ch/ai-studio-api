import consola from "consola"

import { createChatCompletions } from "~/services/create-chat-completions"

import { sleep } from "./sleep"
import { state } from "./state"

export async function processQueue() {
  consola.debug("Starting processQueue loop")

  const INITIAL_SLEEP_DURATION = 100
  const MAX_SLEEP_DURATION = 10_000
  let sleepDuration = INITIAL_SLEEP_DURATION

  while (true) {
    if (state.requestQueue.length <= 0) {
      consola.debug(`Request queue is empty, sleeping for ${sleepDuration}ms`)
      await sleep(sleepDuration)
      sleepDuration = Math.min(
        Math.round(sleepDuration * 1.5),
        MAX_SLEEP_DURATION,
      )
      continue
    }

    consola.debug(`Resetting sleep duration to ${INITIAL_SLEEP_DURATION}ms`)
    sleepDuration = INITIAL_SLEEP_DURATION

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
