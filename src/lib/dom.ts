import type { Page } from "playwright"

import { JSDOM } from "jsdom"

export const getDocument = async (page: Page) => {
  const html = await page.evaluate(() => document.body.innerHTML)
  const dom = new JSDOM(html)
  return dom.window.document
}
