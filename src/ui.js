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
  sheet().classList.remove('open')
  document.querySelectorAll('.pin.sel').forEach(n => n.classList.remove('sel'))
}

let timer
export function toast(msg) {
  const t = document.getElementById('toast')
  t.textContent = msg
  t.classList.add('show')
  clearTimeout(timer)
  timer = setTimeout(() => t.classList.remove('show'), 2400)
}

// Reliability bar — used by toilets (廁紙) and food (English OK). One widget.
export function scoreBar(label, r, colour) {
  const p = Math.round(r.yes / (r.yes + r.no) * 100)
  const c = colour || (p >= 60 ? '#34c98b' : p >= 35 ? '#f2c53d' : '#ff6b6b')
  const textColour = p >= 60 ? '#1f9d6b' : p >= 35 ? '#a8730a' : '#e04848'
  return `<div class="score">
    <div class="stop"><span>${label}</span><span class="val" style="color:${textColour}">${Math.round(p / 10)} / 10</span></div>
    <div class="track"><i style="width:${p}%;background:${c}"></i></div>
    <div class="meta">${t('reportsMeta', { count: r.yes + r.no })}</div>
  </div>`
}
