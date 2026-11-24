import { describe, beforeAll, test, expect } from 'vitest'
import 'vitest-puppeteer'

const url = 'http://localhost:5173'

describe('Page load', () => {
  test('page loads without errors', async () => {
    const errors: Error[] = []

    page.on('pageerror', (error) => {
      errors.push(error)
    })

    page.on('error', (error) => {
      errors.push(error)
    })

    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 30000
    })

    await page.waitForSelector('body')
    expect(errors.length).toBe(0)
  }, 30000)
})

describe('Page structure', () => {
  beforeAll(async () => {
    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 30000
    })
  }, 30000)

  test('page has expected title', async () => {
    const title = await page.title()
    expect(title).toBe('Open Infrastructure Map')
  })

  test('page has expected structure', async () => {
    expect((await page.$('body')) !== null).toBe(true)
    const isPageInteractive = await page.evaluate(() => {
      return document.readyState === 'complete'
    })
    expect(isPageInteractive).toBe(true)
  })
})

describe('Layers panel map-first behavior', () => {
  beforeAll(async () => {
    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 30000
    })
    await page.waitForSelector('.oim-unified-options')
  }, 30000)

  test('starts collapsed on load', async () => {
    const collapsed = await page.$eval('.oim-unified-options .oim-unified-panel', (el) =>
      el.classList.contains('oim-unified-panel-collapsed')
    )
    expect(collapsed).toBe(true)
    const tall = await page.$eval('.oim-unified-options', (el) =>
      el.classList.contains('oim-unified-options--tall')
    )
    expect(tall).toBe(false)
  })

  test('opens in compact mode without tall class', async () => {
    await page.click('.oim-unified-header-icon')
    const collapsed = await page.$eval('.oim-unified-options .oim-unified-panel', (el) =>
      el.classList.contains('oim-unified-panel-collapsed')
    )
    expect(collapsed).toBe(false)
    const tall = await page.$eval('.oim-unified-options', (el) =>
      el.classList.contains('oim-unified-options--tall')
    )
    expect(tall).toBe(false)
  })

  test('expanding a power subsection applies tall class', async () => {
    const isCollapsed = await page.$eval('.oim-unified-options .oim-unified-panel', (el) =>
      el.classList.contains('oim-unified-panel-collapsed')
    )
    if (isCollapsed) {
      await page.click('.oim-unified-header-icon')
    }
    await page.click('[data-power-subsection="plants"] .oim-unified-section-header')
    const tall = await page.$eval('.oim-unified-options', (el) =>
      el.classList.contains('oim-unified-options--tall')
    )
    expect(tall).toBe(true)
  })

  test('Escape closes the panel', async () => {
    const isCollapsed = await page.$eval('.oim-unified-options .oim-unified-panel', (el) =>
      el.classList.contains('oim-unified-panel-collapsed')
    )
    if (isCollapsed) {
      await page.click('.oim-unified-header-icon')
    }
    await page.keyboard.press('Escape')
    const collapsed = await page.$eval('.oim-unified-options .oim-unified-panel', (el) =>
      el.classList.contains('oim-unified-panel-collapsed')
    )
    expect(collapsed).toBe(true)
    const tall = await page.$eval('.oim-unified-options', (el) =>
      el.classList.contains('oim-unified-options--tall')
    )
    expect(tall).toBe(false)
  })
})
