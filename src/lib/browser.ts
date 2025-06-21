import { chromium } from "playwright"
import invariant from "tiny-invariant"
import { x } from "tinyexec"

import { sleep } from "./utils"

export const spawnChromium = async (executablePath: string, delay: number) => {
  x(executablePath, ["--remote-debugging-port=9222"])
  await sleep(delay)
}

export const createPage = async () => {
  const browser = await chromium.connectOverCDP("http://localhost:9222", {})
  const context = browser.contexts().at(0)
  invariant(context, "Default context not found")

  await context.grantPermissions(["clipboard-read", "clipboard-write"])

  const page = context.pages().at(0)
  invariant(page, "Default page not found")

  return page
}
