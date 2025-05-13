#!/usr/bin/env node

import { defineCommand, runMain } from "citty"
import consola from "consola"
import { serve, type ServerHandler } from "srvx"

import { createPage, spawnChromium } from "./lib/browser"
import { cacheModels } from "./lib/models"
import { processQueue } from "./lib/queue"
import { state } from "./lib/state"
import { server } from "./server"

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

  consola.debug("Spawning Chromium...")
  await spawnChromium()

  consola.debug("Creating new page...")
  state.page = await createPage()

  state.manualApprove = options.manual
  consola.debug(`Manual approval: ${state.manualApprove}`)

  state.rateLimitSeconds = options.rateLimit
  consola.debug(`Rate limit seconds: ${state.rateLimitSeconds}`)

  state.rateLimitWait = options.rateLimitWait
  consola.debug(`Rate limit wait: ${state.rateLimitWait}`)

  consola.debug("Navigating to AI Studio...")
  await state.page.goto("https://aistudio.google.com/prompts/new_chat")

  await cacheModels()

  const serverUrl = `http://localhost:${options.port}`
  consola.box(`Server started at ${serverUrl}`)

  void processQueue()

  serve({
    fetch: server.fetch as ServerHandler,
    port: options.port,
  })
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
    consola.debug(`Raw rate-limit arg: ${rateLimitRaw}`)
    const rateLimit =
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      rateLimitRaw === undefined ? undefined : Number.parseInt(rateLimitRaw, 10)
    consola.debug(`Parsed rateLimit: ${rateLimit}`)

    const port = Number.parseInt(args.port, 10)
    consola.debug(`Parsed port: ${port}`)

    consola.debug(`Verbose arg: ${args.verbose}`)
    consola.debug(`Manual arg: ${args.manual}`)
    consola.debug(`Wait arg: ${args.wait}`)

    return runServer({
      port,
      verbose: args.verbose,
      manual: args.manual,
      rateLimit,
      rateLimitWait: Boolean(args.wait),
    })
  },
})

void runMain(main)
