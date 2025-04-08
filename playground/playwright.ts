import fs from "node:fs/promises"
import { chromium } from "playwright"
import { expect } from "playwright/test"
import { x } from "tinyexec"

x("chromium", ["--remote-debugging-port=9222"])

await new Promise((resolve) => setTimeout(resolve, 2000))

const browser = await chromium.connectOverCDP("http://localhost:9222", {})

const page = await browser.contexts()[0].newPage()

await page.goto("https://aistudio.google.com/prompts/new_chat", {
  waitUntil: "networkidle",
})

const content = await page.evaluate(() => document.body.innerHTML)

await fs.writeFile("./playground/chat-container.html", content)

interface Message {
  role: "system" | "user" | "assistant"
  content: string
}

const sampleMessages: Array<Message> = [
  {
    role: "system",
    content: "You are a helpful assistant that provides concise answers.",
  },
  {
    role: "user",
    content: "What is the tallest mountain in the world?",
  },
  {
    role: "assistant",
    content: "Mount Everest is the tallest mountain in the world.",
  },
  {
    role: "user",
    content: "How high is it exactly?",
  },
  {
    role: "assistant",
    content:
      "Its official elevation is 8,848.86 meters (29,031.7 feet) above sea level.",
  },
  {
    role: "user",
    content: "Where is it located?",
  },
  {
    role: "assistant",
    content:
      "Mount Everest is located in the Mahalangur Himalayas range, straddling the border between Nepal and the Tibet Autonomous Region of China.",
  },
]

const writeUserMessage = async (message: Message) => {
  const textarea = page.getByPlaceholder("Type something")
  await textarea.fill(message.content)
  // await page.focus(inputSelector)
  // await page.keyboard.insertText(message.content)
  await page.keyboard.down("Alt")
  await page.keyboard.press("Enter")
  await page.keyboard.up("Alt")
}

const writeSystemMessage = async (message: Message) => {
  const collapsibleSelector = "ms-system-instructions > div"
  const collapsible = page.locator(collapsibleSelector)

  try {
    await expect(collapsible).not.toHaveClass(/(^|\s)collapsed(\s|$)/, {
      timeout: 1000,
    })
  } catch {
    const collapseButton = page.locator(
      'button[aria-label="Collapse all System Instructions"]',
    )

    await collapseButton.click()
  }

  const textarea = page.getByPlaceholder(
    "Optional tone and style instructions for the model",
  )
  await textarea.fill(message.content)
}

const clearChat = async () => {
  const button = page.locator('button[aria-label="Clear chat"]')
  if (await button.isDisabled()) return
  await button.click()

  await new Promise((resolve) => setTimeout(resolve, 1000))

  const continueButton = page
    .getByRole("button")
    .filter({ hasText: "Continue" })

  await continueButton.click()
}

await clearChat()

for (const message of sampleMessages) {
  if (message.role === "system") {
    await writeSystemMessage(message)
    continue
  }

  if (message.role === "user") {
    console.log("Writing user message", message)
    await writeUserMessage(message)
    continue
  }
}
