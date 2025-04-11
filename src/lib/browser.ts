import { chromium } from "playwright"
import invariant from "tiny-invariant"
import { x } from "tinyexec"

import { sleep } from "./sleep"

export const spawnChromium = async () => {
  x("chromium", ["--remote-debugging-port=9222"])
  await sleep(5000)
}

export const createPage = async () => {
  const browser = await chromium.connectOverCDP("http://localhost:9222", {})
  const context = browser.contexts().at(0)
  invariant(context, "Default context not found")

  const page = context.pages().at(0)
  invariant(page, "Default page not found")

  return page
}
