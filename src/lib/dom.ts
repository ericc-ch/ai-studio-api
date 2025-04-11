import type { Page } from "playwright"

import { JSDOM } from "jsdom"

export const getDom = async (page: Page) => {
  const html = await page.evaluate(() => document.body.innerHTML)
  return new JSDOM(html)
}

export const getDocument = async (page: Page) => {
  const dom = await getDom(page)
  return dom.window.document
}
