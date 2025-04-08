import { JSDOM } from "jsdom"
import fs from "node:fs"

// Define the structure for OpenAI compatible messages
interface OpenAIMessage {
  role: "user" | "assistant"
  content: string
}

// Define the structure for the parsing result
interface ParseResult {
  messages: Array<OpenAIMessage>
  isLoading: boolean
}

// eslint-disable-next-line complexity
function parseAIChat(htmlContent: string): ParseResult {
  const dom = new JSDOM(htmlContent)
  const document = dom.window.document

  const messages: Array<OpenAIMessage> = []
  let isLoading = false

  // --- Parse Chat Content ---
  // Select all chat turn containers
  const chatTurns = document.querySelectorAll("ms-chat-turn")

  console.log("Chat Turns:", chatTurns.length)

  for (const turn of chatTurns) {
    let role: OpenAIMessage["role"] | null = null
    let content = ""

    // Determine role
    if (turn.classList.contains("user")) {
      role = "user"
      // Extract content specifically from the user's cmark node
      const contentNode = turn.querySelector(
        "div[data-turn-role='User'] ms-cmark-node",
      )
      content = contentNode?.textContent?.trim() ?? ""
    } else if (turn.classList.contains("model")) {
      // Check if this model turn contains the actual response (not just thoughts)
      // Heuristic: The response turn doesn't contain the collapsible "Thoughts" section directly within its main prompt chunk display area.
      // More reliably: Often the 'thoughts' are in a separate turn or structure.
      // Let's check if this turn *lacks* the 'thought-container' directly under the main content display,
      // or simply grab content if it's present. The provided example shows thoughts *and* response sometimes in separate turns.
      // A simpler approach: if it's a model turn, check if it has a 'thought-container'. If NOT, it's likely the main response.
      const hasThoughts = turn.querySelector(".thought-container")
      if (!hasThoughts) {
        role = "assistant" // OpenAI uses 'assistant' for the model
        const contentNode = turn.querySelector(
          "div[data-turn-role='Model'] ms-cmark-node",
        )
        // Sometimes the thoughts *are* in a cmark-node within the thought container,
        // so we need to be more specific or rely on the structure where response turns lack the container.
        // Let's refine: Get content from the cmark-node directly under turn-content, assuming it's the primary one.
        const primaryContentNode = turn.querySelector(
          "div[data-turn-role='Model'] > .turn-content > ms-prompt-chunk > ms-text-chunk > ms-cmark-node",
        )
        content = primaryContentNode?.textContent?.trim() ?? ""

        // If the above is too specific and fails, fall back to the less specific selector
        if (!content) {
          const fallbackContentNode = turn.querySelector(
            "div[data-turn-role='Model'] ms-cmark-node",
          )
          content = fallbackContentNode?.textContent?.trim() ?? ""
        }
      }
      // If it HAS thoughts, we *might* skip it, assuming the actual response is in a subsequent model turn without thoughts.
      // Or, if thoughts and response are *always* separate turns, this logic works.
    }

    // Add to messages array if role and content are valid
    if (role && content) {
      messages.push({ role, content })
    }
  }

  // --- Determine Loading State ---
  // Find the run button's label span
  const runButtonLabel = document.querySelector(
    "run-button button.run-button span.label",
  )

  // Check if the button text is "Stop" (or alternatively, check for a specific loading class if one exists)
  // Also consider if the button is enabled vs disabled
  const runButton = document.querySelector("run-button button.run-button")
  const isDisabled = runButton?.hasAttribute("disabled")

  // Simple check: If the label explicitly says "Stop", it's loading.
  // A more robust check might involve seeing if it's *not* disabled *and* potentially has different text/class.
  // For this example, we'll check for "Stop" text.
  if (runButtonLabel && runButtonLabel.textContent?.trim() === "Stop") {
    isLoading = true
  }
  // You could also add logic like: else if (!isDisabled) { isLoading = true; }
  // But that might be true just because the user typed something.
  // Relying on "Stop" text or a dedicated loading class is usually safer.

  return { messages, isLoading }
}

// --- Example Usage ---
const html = fs.readFileSync("./playground/ai-studio.html", "utf8")

// Remove the start/end markers if they exist in the string
const cleanHtml = html
  .replace("--- START OF FILE ai-studio.html ---", "")
  .replace("--- END OF FILE ai-studio.html ---", "")
  .trim()

const result = parseAIChat(cleanHtml)

console.log("Parsed Messages:", JSON.stringify(result.messages, null, 2))
console.log("Is Loading:", result.isLoading)
