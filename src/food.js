// OWNER: B — 美食 screen only.
import { DIET } from './data.js'
import { getPlaces, createPlace, me, metres, score, tone, toneText, navTo } from './api.js'
import { closeSheet, openSheet, scoreBar, toast } from './ui.js'
import { localName, localPhrase, onLanguageChange, sayMeaning, secondaryName, t } from './i18n.js'

// ponytail: only filters the survey data can actually answer. Add 全素/無豬肉
// back once E's walking survey tags vegan and pork — right now every place is
// veg or ask, so those two filters would return everything or nothing.
const FILTERS = [
  ['veg',   'filterVeg',   f => f.diet.includes('veg')],
  ['cheap', 'filterCheap', f => f.price === 1],
  ['near',  'filterNear',  f => metres(me, f) < 400]
]
const on = new Set()
let currentFood = null
const html = value => String(value ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

export async function initFood() {
  const chips = document.getElementById('fchips')
  FILTERS.forEach(([key, labelKey]) => {
    const b = document.createElement('button')
    b.className = 'chip'; b.dataset.on = '0'; b.dataset.filter = key; b.textContent = t(labelKey)
    b.onclick = () => {
      on.has(key) ? (on.delete(key), b.dataset.on = '0') : (on.add(key), b.dataset.on = '1')
      render()
    }
    chips.appendChild(b)
  })
  onLanguageChange(async () => {
    const reopen = currentFood && document.getElementById('sheet').classList.contains('open') &&
      document.getElementById('s-food').classList.contains('on')
    renderFilters()
    await render()
    if (reopen) openFoodDetails(currentFood)
  })
  buildAddForm()
  render()
}

// Adds at the user's current position — they are standing at the place they
// are recommending. No map-tap picker, no address lookup.
function buildAddForm() {
  const box = document.getElementById('addplace')
  if (!box) return
  box.innerHTML = `
    <input id="ap-name" type="text" placeholder="${t('addPlaceName')}" maxlength="60" autocomplete="off">
    <input id="ap-note" type="text" placeholder="${t('addPlaceNote')}" maxlength="80" autocomplete="off">
    <span class="hint">📍 ${t('addPlaceHere')}</span>
    <button class="btn go" id="ap-save">${t('addPlaceSave')}</button>`

  document.getElementById('ap-save').onclick = async () => {
    const name = document.getElementById('ap-name').value.trim()
    if (!name) return toast(t('addPlaceNeedName'))
    await createPlace({ name, note: document.getElementById('ap-note').value.trim(), lat: me.lat, lng: me.lng })
    document.getElementById('ap-name').value = ''
    document.getElementById('ap-note').value = ''
    await render()
    toast(t('addPlaceDone'))
  }
}

function renderFilters() {
  FILTERS.forEach(([key, labelKey]) => {
    const chip = document.querySelector(`[data-filter="${key}"]`)
    if (chip) chip.textContent = t(labelKey)
  })
}

async function render() {
  const all = (await getPlaces()).filter(p => p.type === 'food')
  const list = all
    .filter(f => FILTERS.every(([key, , test]) => !on.has(key) || test(f)))
    .sort((a, b) => score(b) - score(a))

  const el = document.getElementById('flist')
  if (!list.length) {
    el.innerHTML = `<div class="card empty">${t('noMatches')}</div>`
    return
  }

  el.innerHTML = list.map(f => {
    const p = score(f)
    const tags = foodTags(f)
    return `<div class="card restaurant-card" data-restaurant="${f.placeId}" role="button" tabindex="0"
      aria-label="${html(t('viewDetails'))}: ${html(localName(f))}">
      <div class="frow">
        <div class="fic">${f.icon}</div>
        <div style="flex:1">
          <div class="fname">${html(localName(f))}</div>
          <div class="fsub">${html(secondaryName(f))}</div>
          <div class="tags">${tags}</div>
        </div>
      </div>
      <div class="fmeta">🚶 ${t('distanceMetres', { count: metres(me, f) })}
        <span class="eng" style="background:${tone(p)}22;color:${toneText(p)}">${t('orderEnglish')} ${Math.round(p / 10)}/10</span>
      </div>
      <div class="say" data-say="${f.placeId}">💬 <div>${html(localPhrase(f))}<small>${html(sayMeaning(f))}</small></div></div>
      <div class="actions"><button class="btn go" data-go="${f.lat},${f.lng}">🧭 ${t('go')}</button></div>
    </div>`
  }).join('')

  el.querySelectorAll('[data-restaurant]').forEach(card => {
    const restaurant = list.find(f => f.placeId === card.dataset.restaurant)
    const open = () => openFoodDetails(restaurant)
    card.onclick = e => { if (!e.target.closest('[data-say], [data-go]')) open() }
    card.onkeydown = e => {
      if (e.target === card && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault()
        open()
      }
    }
  })
  el.querySelectorAll('[data-say]').forEach(n => n.onclick = e => {
    e.stopPropagation()
    toast('「' + localPhrase(list.find(f => f.placeId === n.dataset.say)) + '」')
  })
  el.querySelectorAll('[data-go]').forEach(n => n.onclick = e => {
    e.stopPropagation()
    const restaurant = list.find(f => `${f.lat},${f.lng}` === n.dataset.go)
    if (restaurant) navTo(restaurant.lat, restaurant.lng)
  })
}

function foodTags(f) {
  return f.diet.map(d => `<span class="tag ${DIET[d][1]}">${t(`diet.${d}`)}</span>`).join('') +
    (f.cash ? `<span class="tag t-cash">${t('cash')}</span>` : '') +
    (f.price === 1 ? '<span class="tag t-cheap">NT$ ~100</span>' : '')
}

function openFoodDetails(f) {
  if (!f) return
  currentFood = f
  openSheet(`
    <div class="head">
      <button class="back" data-food-close aria-label="${html(t('close'))}">×</button>
      <div class="bulb" style="background:#ff8a3d22">${f.icon}</div>
      <div><div class="name">${html(localName(f))}</div><div class="sub">${html(secondaryName(f))}</div></div>
      <div class="dist">${t('distanceMetres', { count: metres(me, f) })}</div>
    </div>
    <div class="tags">${foodTags(f)}</div>
    ${scoreBar(t('englishOkay'), f, '#ff8a3d')}
    <div class="say" data-food-say>💬 <div>${html(localPhrase(f))}<small>${html(sayMeaning(f))}</small></div></div>
    <div class="actions"><button class="btn go" data-food-nav>🧭 ${t('go')}</button></div>`)

  document.querySelector('[data-food-close]').onclick = () => { currentFood = null; closeSheet() }
  document.querySelector('[data-food-say]').onclick = () => toast('「' + localPhrase(f) + '」')
  document.querySelector('[data-food-nav]').onclick = () => navTo(f.lat, f.lng)
}
