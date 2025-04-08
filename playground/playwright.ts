import fs from "node:fs/promises"
import { chromium } from "playwright"
import { x } from "tinyexec"

x("chromium", ["--remote-debugging-port=9222"])

await new Promise((resolve) => setTimeout(resolve, 1000))

const browser = await chromium.connectOverCDP("http://localhost:9222", {})

const page = await browser.contexts()[0].newPage()

await page.goto(
  "https://aistudio.google.com/prompts/1Yb5n51NV3KvvIwzlV27P5o-F5m_lw6Y0",
  { waitUntil: "networkidle" },
)

const content = await page.evaluate(() => document.body.innerHTML)

await fs.writeFile("./playground/chat-container.html", content)

await browser.close()
