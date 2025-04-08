import { JSDOM } from "jsdom"
import fs from "node:fs/promises"

const chatHtml = await fs.readFile("./playground/chat-container.html", "utf8")
const {
  window: { document: chatDocument },
} = new JSDOM(chatHtml)

const turns = chatDocument.querySelectorAll("ms-chat-turn")

// --- The Logic ---
// 1. Select the potential label element using the CSS selector
const stopLabelElement = chatDocument.querySelector(
  "div.button-wrapper run-button button span.label",
)

// 2. Check if the element was found AND if its text content is exactly 'Stop'
const hasStopButton =
  stopLabelElement !== null && stopLabelElement.textContent?.trim() === "Stop"
// --- End Logic ---

// Output the boolean flag
console.log(hasStopButton) // Output: true (based on your provided snippet)
