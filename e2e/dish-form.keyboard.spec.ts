import { expect, test, type Page } from '@playwright/test'
import path from 'node:path'
import { loginWithKeyboard } from './support/auth'

// Graba un vídeo del formulario de platos manejado SOLO con el teclado.
// Tras abrir la aplicación no se usa el ratón: Tab, Shift+Tab, flechas, escribir y Enter.
test.use({ video: { mode: 'on', size: { width: 1100, height: 900 } } })

const VIDEO_PATH = path.resolve(__dirname, '..', 'e2e-videos', 'dish-form-keyboard.webm')

const pause = (page: Page, ms = 700) => page.waitForTimeout(ms)

/** Pulsa Tab (o Shift+Tab) hasta que el foco llega al elemento indicado. */
async function tabTo(page: Page, selector: string, reverse = false) {
  for (let i = 0; i < 40; i++) {
    if (await page.evaluate(sel => document.activeElement?.matches(sel) ?? false, selector)) return
    await page.keyboard.press(reverse ? 'Shift+Tab' : 'Tab')
    await pause(page, 300)
  }
  throw new Error(`No se alcanzó ${selector} con el teclado`)
}

async function type(page: Page, text: string) {
  await page.keyboard.type(text, { delay: 90 })
  await pause(page)
}

/** Elige una opción de un <select> enfocado escribiendo el inicio de su texto (type-ahead). */
async function choose(page: Page, selector: string, optionStart: string) {
  await tabTo(page, selector)
  await page.keyboard.type(optionStart, { delay: 120 })
  await pause(page)
}

async function replaceValue(page: Page, text: string) {
  await page.keyboard.press('ControlOrMeta+a')
  await type(page, text)
}

test('crear un plato navegando solo con el teclado', async ({ page }) => {
  test.setTimeout(180_000)
  await loginWithKeyboard(page)
  await pause(page, 1000)

  // Lista de platos del restaurante 1; entrar al formulario con Tab + Enter
  await page.goto('/restaurants/rest-1/dishes')
  await page.locator('table').waitFor()
  const before = await page.getByText('Tarta de queso', { exact: true }).count()
  await pause(page, 1200)
  await tabTo(page, 'a[href$="/dishes/new"]')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Nuevo plato' })).toBeVisible()
  await pause(page, 1200)

  // 1) Enviar el formulario incompleto: errores en el resumen y en los campos
  await tabTo(page, 'button[type="submit"]')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('alert').filter({ hasText: '2 errores' })).toBeFocused()
  await expect(page.locator('[aria-invalid="true"]')).toHaveCount(2)
  await pause(page, 2500)
  await page.keyboard.press('Tab') // primer enlace del resumen
  await pause(page, 600)
  await page.keyboard.press('Enter') // lleva el foco al campo Nombre
  await expect(page.getByLabel('Nombre del plato')).toBeFocused()

  // 2) Completar y modificar datos
  await type(page, 'Tarta de queso')
  await page.keyboard.press('Tab')
  await replaceValue(page, '6.5')
  await choose(page, '#dish-category', 'Post')
  await choose(page, '#dish-available', 'N')
  await page.keyboard.type('S', { delay: 120 }) // de vuelta a «Sí»
  await pause(page, 500)
  await page.keyboard.press('Tab')
  await type(page, 'Tarta cremosa con base de galleta')

  // 3) Ingredientes: error sin elegir, añadir dos, quitar uno y añadir otro
  await tabTo(page, 'button.add-btn')
  await page.keyboard.press('Enter')
  await expect(page.locator('#ingredient-error')).toBeVisible()
  await pause(page, 1800)
  await choose(page, '#new-ingredient', 'Queso')
  await page.keyboard.press('Tab')
  await replaceValue(page, '2')
  await page.keyboard.press('Enter') // Enter en cantidad añade el ingrediente
  await pause(page, 1500)
  await choose(page, '#new-ingredient', 'Albahaca')
  await page.keyboard.press('Tab')
  await replaceValue(page, '3')
  await page.keyboard.press('Enter')
  await pause(page, 1500)
  await expect(page.locator('.ingredient-chip')).toHaveCount(2)
  await tabTo(page, '.chip-remove', true) // Shift+Tab hasta «Quitar Albahaca»
  await pause(page, 800)
  await page.keyboard.press('Enter')
  await expect(page.getByLabel('Ingrediente', { exact: true })).toBeFocused() // el foco no se pierde
  await pause(page, 1200)
  await choose(page, '#new-ingredient', 'Ajo')
  await page.keyboard.press('Tab')
  await replaceValue(page, '1')
  await page.keyboard.press('Enter')
  await pause(page, 1800)
  await expect(page.locator('.ingredient-chip')).toHaveText([/Queso mozzarella \(kg\) — 2/, /Ajo \(kg\) — 1/])
  await expect(page.getByLabel('Precio (€)')).toHaveValue('6.5')

  // 4) Guardar y ver el plato en la lista
  await tabTo(page, 'button[type="submit"]')
  await pause(page, 800)
  await page.keyboard.press('Enter')
  await expect(page.locator('table')).toBeVisible()
  await expect(page.getByText('Tarta de queso', { exact: true })).toHaveCount(before + 1)
  await pause(page, 3000)

  await page.close()
  await page.video()!.saveAs(VIDEO_PATH)
})
