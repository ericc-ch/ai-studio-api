import { chromium, type Locator } from "playwright"
import { expect } from "playwright/test"
import { x } from "tinyexec"

import { buildPrompt } from "./prompt"

x("chromium", ["--remote-debugging-port=9222"])

await new Promise((resolve) => setTimeout(resolve, 2000))

const browser = await chromium.connectOverCDP("http://localhost:9222", {})

const page = await browser.contexts()[0].newPage()

await page.goto("https://aistudio.google.com/prompts/new_chat", {
  waitUntil: "networkidle",
})

// const content = await page.evaluate(() => document.body.innerHTML)

// await fs.writeFile("./playground/chat-container.html", content)

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
    content:
      "Where is it located? Like the full address. Is there a story behind it?",
  },
]

const writeUserMessage = async (message: Message) => {
  // const textarea = page.getByPlaceholder("Type something")
  const textarea = page.locator(
    'textarea[aria-label="Type something or pick one from prompt gallery"]',
  )
  await textarea.fill(message.content)
  // await page.focus(inputSelector)
  // await page.keyboard.insertText(message.content)
  await page.keyboard.down("Control")
  await page.keyboard.press("Enter")
  await page.keyboard.up("Control")
}

const locatorVisible = async (locator: Locator) => {
  try {
    await expect(locator).toBeVisible({ timeout: 1000 })
    return true
  } catch {
    return false
  }
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

// await clearChat()

const prompt = buildPrompt(sampleMessages)

const temperatureSelector =
  'div[data-test-id="temperatureSliderContainer"] input[type="number"]'

const tempElement = page.locator(temperatureSelector)
await tempElement.fill("0.5")

await writeUserMessage({ role: "user", content: prompt })

await new Promise((resolve) => setTimeout(resolve, 1000))

const stopButton = page.getByRole("button").filter({ hasText: "Stop" })

while (await locatorVisible(stopButton)) {
  await new Promise((resolve) => setTimeout(resolve, 1000))
  console.log("Stop button is visible")
}

const chatContainer = page.locator("ms-chat-session")
const chatContainerHtml = await chatContainer.innerHTML()

// for (const message of sampleMessages) {
//   if (message.role === "system") {
//     await writeSystemMessage(message)
//     continue
//   }

//   if (message.role === "user") {
//     console.log("Writing user message", message)
//     await writeUserMessage(message)
//     continue
//   }
// }
