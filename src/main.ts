#!/usr/bin/env node

import { defineCommand, runMain } from "citty"
import consola from "consola"

import { createPage, spawnChromium } from "./lib/browser"
import { cacheModels } from "./lib/models"
import { state } from "./lib/state"

interface RunServerOptions {
  port: number
  verbose: boolean
  manual: boolean
  rateLimit: number | undefined
  rateLimitWait: boolean
}

export async function runServer(options: RunServerOptions): Promise<void> {
  if (options.verbose) {
    consola.level = 5
    consola.info("Verbose logging enabled")
  }

  await spawnChromium()
  state.page = await createPage()

  state.manualApprove = options.manual
  state.rateLimitSeconds = options.rateLimit
  state.rateLimitWait = options.rateLimitWait

  await state.page.goto("https://aistudio.google.com/prompts/new_chat")

  await cacheModels()

  const serverUrl = `http://localhost:${options.port}`
  consola.box(`Server started at ${serverUrl}`)

  // serve({
  //   fetch: server.fetch as ServerHandler,
  //   port: options.port,
  // })
}

const main = defineCommand({
  args: {
    port: {
      alias: "p",
      type: "string",
      default: "4141",
      description: "Port to listen on",
    },
    verbose: {
      alias: "v",
      type: "boolean",
      default: false,
      description: "Enable verbose logging",
    },
    manual: {
      type: "boolean",
      default: false,
      description: "Enable manual request approval",
    },
    "rate-limit": {
      alias: "r",
      type: "string",
      description: "Rate limit in seconds between requests",
    },
    wait: {
      alias: "w",
      type: "boolean",
      default: false,
      description:
        "Wait instead of error when rate limit is hit. Has no effect if rate limit is not set",
    },
  },
  run({ args }) {
    const rateLimitRaw = args["rate-limit"]
    const rateLimit =
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      rateLimitRaw === undefined ? undefined : Number.parseInt(rateLimitRaw, 10)

    const port = Number.parseInt(args.port, 10)

    return runServer({
      port,
      verbose: args.verbose,
      manual: args.manual,
      rateLimit,
      rateLimitWait: Boolean(args.wait),
    })
  },
})

await runMain(main)
