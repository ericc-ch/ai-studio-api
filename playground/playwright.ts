import fs from "node:fs/promises"
import { chromium } from "playwright"
import { x } from "tinyexec"

x("chromium", ["--remote-debugging-port=9222"])

await new Promise((resolve) => setTimeout(resolve, 5000))

const browser = await chromium.connectOverCDP("http://localhost:9222", {})

const page = await browser.contexts()[0].newPage()

await page.goto(
  "https://aistudio.google.com/prompts/1Yb5n51NV3KvvIwzlV27P5o-F5m_lw6Y0",
  { waitUntil: "networkidle" },
)

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

const inputSelector = "ms-prompt-input-wrapper textarea"

const writeUserMessage = async (message: Message) => {
  const textarea = page.getByPlaceholder("Type something")
  await textarea.fill(message.content)
  // await page.focus(inputSelector)
  // await page.keyboard.insertText(message.content)
  await page.keyboard.down("Alt")
  await page.keyboard.press("Enter")
  await page.keyboard.up("Alt")
  await page.waitForSelector(`ms-chat-turn.${message.role}`)
}

const writeSystemMessage = async (message: Message) => {
  const collapsible = page
    .getByRole("button")
    .filter({ hasText: "System Instructions" })

  await collapsible.click()
}

await writeSystemMessage(sampleMessages[0])
await writeUserMessage(sampleMessages[0])
