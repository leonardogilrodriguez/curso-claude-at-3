import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { loginWithKeyboard } from './support/auth'

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

// Solo el formulario (el menú lateral y el resto de la aplicación quedan fuera del alcance de la issue).
async function scan(page: Page) {
  // Esperar a que acaben las animaciones de entrada: axe mide el contraste con la opacidad actual.
  await page.evaluate(() => Promise.all(document.getAnimations().map(a => a.finished)))
  return new AxeBuilder({ page }).include('app-dish-form').withTags(WCAG_TAGS).analyze()
}

function describeViolations(violations: Awaited<ReturnType<typeof scan>>['violations']) {
  return violations.map(v => `${v.id} (${v.impact}): ${v.nodes.map(n => n.target.join(' ')).join(', ')}`)
}

test.describe('Formulario de platos: accesibilidad (axe, WCAG 2.2 AA)', () => {
  test.beforeEach(async ({ page }) => {
    await loginWithKeyboard(page)
  })

  test('formulario nuevo sin violaciones', async ({ page }) => {
    await page.goto('/restaurants/rest-1/dishes/new')
    await page.locator('#dish-name').waitFor()
    const { violations } = await scan(page)
    expect(describeViolations(violations)).toEqual([])
  })

  test('formulario con errores visibles sin violaciones', async ({ page }) => {
    await page.goto('/restaurants/rest-1/dishes/new')
    await page.getByRole('button', { name: 'Guardar' }).click()
    await expect(page.getByRole('alert')).toContainText('2 errores')
    const { violations } = await scan(page)
    expect(describeViolations(violations)).toEqual([])
  })

  test('formulario con un ingrediente añadido y error de ingrediente sin violaciones', async ({ page }) => {
    await page.goto('/restaurants/rest-1/dishes/new')
    await page.getByLabel('Ingrediente').selectOption({ index: 1 })
    await page.getByRole('button', { name: 'Añadir ingrediente' }).click()
    await page.getByRole('button', { name: 'Añadir ingrediente' }).click() // sin selección → error
    await expect(page.locator('#ingredient-error')).toBeVisible()
    const { violations } = await scan(page)
    expect(describeViolations(violations)).toEqual([])
  })

  test('formulario de edición sin violaciones', async ({ page }) => {
    await page.goto('/restaurants/rest-1/dishes')
    await page.locator('table a[href$="/edit"]').first().waitFor()
    await page.locator('table a[href$="/edit"]').first().click()
    await expect(page.getByLabel('Nombre del plato')).not.toHaveValue('')
    const { violations } = await scan(page)
    expect(describeViolations(violations)).toEqual([])
  })
})
