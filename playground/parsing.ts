import { JSDOM } from "jsdom"
import fs from "node:fs/promises"

const html = await fs.readFile("./playground/chat-container.html", "utf8")
const dom = new JSDOM(html)
const document = dom.window.document

const turns = document.querySelectorAll("ms-chat-turn")
