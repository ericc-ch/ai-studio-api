#!/usr/bin/env node

import { defineCommand, runMain } from "citty"
import clipboard from "clipboardy"
import consola from "consola"
import { serve, type ServerHandler } from "srvx"
import invariant from "tiny-invariant"

import { createPage, spawnChromium } from "./lib/browser"
import { processQueue } from "./lib/queue"
import { generateEnvScript } from "./lib/shell"
import { state } from "./lib/state"
import { cacheModels } from "./lib/utils"
import { server } from "./server"

interface RunServerOptions {
  port: number
  verbose: boolean
  manual: boolean
  json: boolean
  geminiApiKey: string | undefined
  rateLimit: number | undefined
  rateLimitWait: boolean
  browserPath: string
  browserDelay: number
  launchClaudeCode: boolean
}

export async function runServer(options: RunServerOptions): Promise<void> {
  if (options.verbose) {
    consola.level = 5
    consola.info("Verbose logging enabled")
  }

  consola.debug("Spawning Chromium...")
  await spawnChromium(options.browserPath, options.browserDelay)

  consola.debug("Creating new page...")
  state.page = await createPage()

  state.manualApprove = options.manual
  consola.debug(`Manual approval: ${state.manualApprove}`)

  state.json = options.json
  consola.debug(`JSON mode: ${state.json}`)

  state.geminiApiKey = options.geminiApiKey
  consola.debug(
    `Gemini API Key: ${state.geminiApiKey ? "provided" : "not provided"}`,
  )

  state.rateLimitSeconds = options.rateLimit
  consola.debug(`Rate limit seconds: ${state.rateLimitSeconds}`)

  state.rateLimitWait = options.rateLimitWait
  consola.debug(`Rate limit wait: ${state.rateLimitWait}`)

  consola.debug("Navigating to AI Studio...")
  await state.page.goto("https://aistudio.google.com/prompts/new_chat")

  await cacheModels()

  const serverUrl = `http://localhost:${options.port}`

  if (options.launchClaudeCode) {
    invariant(state.models, "Models should be loaded by now")

    const selectedModel = await consola.prompt(
      "Select a model to use with Claude Code",
      {
        type: "select",
        options: state.models.data.map((model) => model.id),
      },
    )

    const selectedSmallModel = await consola.prompt(
      "Select a small model to use with Claude Code",
      {
        type: "select",
        options: state.models.data.map((model) => model.id),
      },
    )

    const command = generateEnvScript(
      {
        ANTHROPIC_BASE_URL: serverUrl,
        ANTHROPIC_AUTH_TOKEN: "dummy",
        ANTHROPIC_MODEL: selectedModel,
        ANTHROPIC_SMALL_FAST_MODEL: selectedSmallModel,
      },
      "claude",
    )

    clipboard.writeSync(command)
    consola.success("Copied Claude Code command to clipboard!")
  }

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
      default: "4157",
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
    json: {
      alias: "j",
      type: "boolean",
      default: false,
      description: "Use JSON mode in AI response, making it easier to parse",
    },
    "gemini-api-key": {
      type: "string",
      description: "Set Gemini API key for proxied requests",
    },
    "rate-limit": {
      alias: "r",
      type: "string",
      description: "Rate limit in seconds between requests",
    },
    "claude-code": {
      alias: "c",
      type: "boolean",
      default: false,
      description:
        "Generate a command to launch Claude Code with the server config",
    },
    wait: {
      alias: "w",
      type: "boolean",
      default: false,
      description:
        "Wait instead of error when rate limit is hit. Has no effect if rate limit is not set",
    },
    "browser-path": {
      type: "string",
      default: "chromium",
      description: "Path to the browser executable",
    },
    "browser-delay": {
      type: "string",
      default: "5000",
      description: "Delay in ms after launching the browser",
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
    consola.debug(`JSON arg: ${args.json}`)

    const geminiApiKey = args["gemini-api-key"]
    consola.debug(
      `Gemini API Key from args: ${geminiApiKey ? "provided" : "not provided"}`,
    )

    consola.debug(`Wait arg: ${args.wait}`)
    consola.debug(`Claude Code arg: ${args["claude-code"]}`)

    const browserPath = args["browser-path"]
    consola.debug(`Browser path: ${browserPath}`)

    const browserDelay = Number.parseInt(args["browser-delay"], 10)
    consola.debug(`Browser delay: ${browserDelay}`)

    return runServer({
      port,
      verbose: args.verbose,
      manual: args.manual,
      json: args.json,
      geminiApiKey,
      rateLimit,
      rateLimitWait: Boolean(args.wait),
      browserPath,
      browserDelay,
      launchClaudeCode: args["claude-code"],
    })
  },
})

void runMain(main)
