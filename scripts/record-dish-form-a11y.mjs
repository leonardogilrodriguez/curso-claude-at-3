// Graba un vídeo navegando por el formulario de platos de web-admin usando SOLO el teclado.
// Requisitos: API (3000) y web-admin (4200) arrancados y `npm run seed` ejecutado.
// Uso: node scripts/record-dish-form-a11y.mjs   → scripts/videos/dish-form-a11y.webm
import { chromium } from 'playwright'
import { mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const BASE = process.env.ADMIN_URL ?? 'http://localhost:4200'
const OUT = join(dirname(fileURLToPath(import.meta.url)), 'videos')
const TMP = join(OUT, '.tmp')
rmSync(TMP, { recursive: true, force: true })
mkdirSync(TMP, { recursive: true })

const browser = await chromium.launch()
const context = await browser.newContext({
  viewport: { width: 1100, height: 900 },
  recordVideo: { dir: TMP, size: { width: 1100, height: 900 } }
})
const page = await context.newPage()
const pause = (ms = 700) => page.waitForTimeout(ms)
const kb = page.keyboard

// Pulsa Tab hasta que el foco llega al elemento indicado (navegación solo con teclado).
async function tabTo(selector, { reverse = false } = {}) {
  for (let i = 0; i < 40; i++) {
    if (await page.evaluate(sel => document.activeElement?.matches(sel), selector)) return
    await kb.press(reverse ? 'Shift+Tab' : 'Tab')
    await pause(350)
  }
  throw new Error(`No se alcanzó ${selector} con Tab`)
}
const type = async text => { await kb.type(text, { delay: 90 }); await pause() }
// Elige una opción de un <select> con el foco en él escribiendo su inicio (type-ahead del navegador).
const select = async (selector, optionStart) => {
  await tabTo(selector)
  await kb.type(optionStart, { delay: 120 })
  await pause(700)
}

// --- Login (único paso con goto: abrir la aplicación) ---
await page.goto(`${BASE}/login`)
await pause(800)
await tabTo('#email'); await type('admin@resttek.com')
await kb.press('Tab'); await type('admin@resttek.com')
await kb.press('Enter')
await page.waitForURL(url => !url.pathname.includes('login'))
await pause(1000)

// Lista de platos del restaurante 1 y entrada al formulario con el teclado
await page.goto(`${BASE}/restaurants/rest-1/dishes`)
await page.waitForSelector('table')
await pause(1200)
await tabTo('a[href$="/dishes/new"]')
await kb.press('Enter')
await page.waitForSelector('#dish-name')
await pause(1200)

// 1) Enviar el formulario incompleto: recorrer con Tab hasta Guardar y pulsar Enter
await tabTo('button[type="submit"]')
await kb.press('Enter')
if (!(await page.locator('.error-summary').isVisible())) throw new Error('Falta el resumen de errores')
if (await page.locator('[aria-invalid="true"]').count() !== 2) throw new Error('Deberían marcarse 2 campos inválidos')
await pause(2500)                                   // resumen de errores con el foco
await kb.press('Tab'); await pause(600)             // primer enlace del resumen
await kb.press('Enter')                             // → foco en el campo Nombre
await pause(1200)

// 2) Completar/modificar datos
await type('Tarta de queso')
await kb.press('Tab'); await pause(400)
await kb.press('ControlOrMeta+a'); await type('6.5')
await select('#dish-category', 'Post')              // Principal → Postre
await select('#dish-available', 'N')                // Sí → No
await kb.type('S', { delay: 120 }); await pause(500) // de vuelta a Sí
await kb.press('Tab'); await type('Tarta cremosa con base de galleta')

// 3) Ingredientes: intento sin elegir ninguno (error), añadir dos, quitar uno, añadir otro
await tabTo('#new-ingredient')
await tabTo('button.add-btn'); await kb.press('Enter'); await pause(1800)
await select('#new-ingredient', 'Queso')
await kb.press('Tab'); await kb.press('ControlOrMeta+a'); await type('2')
await kb.press('Enter'); await pause(1500)          // Enter en el campo cantidad añade el ingrediente
await select('#new-ingredient', 'Albahaca')
await kb.press('Tab'); await kb.press('ControlOrMeta+a'); await type('3')
await kb.press('Enter'); await pause(1500)
await tabTo('.chip-remove', { reverse: true })      // Shift+Tab hasta el botón "Quitar"
await pause(800)
await kb.press('Enter'); await pause(1500)          // el foco pasa al selector
await select('#new-ingredient', 'Ajo')
await kb.press('Tab'); await kb.press('ControlOrMeta+a'); await type('1')
await kb.press('Enter'); await pause(1800)

const chips = await page.locator('.ingredient-chip').allInnerTexts()
if (chips.length !== 2 || chips[0] !== 'Queso mozzarella (kg) — 2' || chips[1] !== 'Ajo (kg) — 1') throw new Error(`Ingredientes inesperados: ${chips}`)

if ((await page.inputValue('#dish-price')) !== '6.5') throw new Error('Precio inesperado')

// 4) Guardar
await tabTo('button[type="submit"]')
await pause(800)
await kb.press('Enter')
await page.waitForSelector('table')
await page.getByText('Tarta de queso').first().waitFor()
await pause(3000)

await context.close()
await browser.close()
const file = readdirSync(TMP).find(f => f.endsWith('.webm'))
renameSync(join(TMP, file), join(OUT, 'dish-form-a11y.webm'))
rmSync(TMP, { recursive: true, force: true })
console.log('Vídeo guardado en scripts/videos/dish-form-a11y.webm')
