// Shared bits all three screens use. Keep this small.
import { t } from './i18n.js'

const sheet = () => document.getElementById('sheet')

export function openSheet(html) {
  const s = sheet()
  s.innerHTML = '<div class="grab"></div>' + html
  s.classList.add('open')
  s.scrollTop = 0
}

export function closeSheet() {
  const s = sheet()
  const wasOpen = s.classList.contains('open')
  s.classList.remove('open')
  document.querySelectorAll('.pin.sel').forEach(n => n.classList.remove('sel'))
  if (wasOpen) s.dispatchEvent(new CustomEvent('sheetclose'))
}

// Pointer-down runs before a button's click handler. That means tapping a new
// card closes the old sheet first, then the card's own click opens its sheet;
// a click that originally opens a sheet is not mistaken for an outside click.
document.addEventListener('pointerdown', event => {
  const s = sheet()
  if (!s?.classList.contains('open') || s.contains(event.target)) return
  closeSheet()
}, true)

let timer
export function toast(msg) {
  const t = document.getElementById('toast')
  t.textContent = msg
  t.classList.add('show')
  clearTimeout(timer)
  timer = setTimeout(() => t.classList.remove('show'), 2400)
}

