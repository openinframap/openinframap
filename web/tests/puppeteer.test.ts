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
  })

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
