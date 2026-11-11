import type { Page } from '@playwright/test'

export const ADMIN = { email: 'admin@resttek.com', password: 'admin@resttek.com' }

/** Inicia sesión rellenando el formulario con el teclado (Tab + escribir + Enter). */
export async function loginWithKeyboard(page: Page, { email, password } = ADMIN) {
  await page.goto('/login')
  await page.locator('#email').waitFor()
  while (!(await page.evaluate(() => document.activeElement?.id === 'email'))) {
    await page.keyboard.press('Tab')
  }
  await page.keyboard.type(email, { delay: 60 })
  await page.keyboard.press('Tab')
  await page.keyboard.type(password, { delay: 60 })
  await page.keyboard.press('Enter')
  await page.waitForURL(url => !url.pathname.includes('login'))
}
