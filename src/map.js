// OWNER: A — map screen only. Nobody else edits this file.
import { PAYMENT_METHODS, TYPES } from './data.js'
import { POI } from './poi.js'
import {
  campus, me, getBuildings, getPlaces, createPlace, loadItems, itemsIn, findItem,
  getYouBikeStations, metres, floorOrder, navTo, watchMe, photoUrl,
  voteEnglish, myEnglishVote
} from './api.js'
import { openSheet, closeSheet, toast } from './ui.js'
import { markVisited } from './profile.js'
import { localName, localPhrase, localText, onLanguageChange, sayMeaning, secondaryName, t as tr } from './i18n.js'

let map, markers = {}, buildings = [], places = [], bikePlaces = [], fallbackBikes = []
let allBikeStations = [], curB = null, curI = null, curP = null
// Start with every category OFF. A map that opens covered in 60 pins is
// noise; the user picks what they are looking for. The category menu also
// starts collapsed so the user can open it when they need it.
const active = new Set()
const html = value => String(value ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

export async function initMap() {
  map = new maplibregl.Map({
    container: 'map',
    center: campus.center,
    zoom: campus.zoom,
    pitch: 55,             // the tilt is what makes it read as a game, not Google Maps
    bearing: -18,
    attributionControl: { compact: true },
    style: 'https://tiles.openfreemap.org/styles/bright'
  })
  map.on('click', () => { creatingPlace ? cancelCreate() : closeSheet() })
  document.getElementById('addpin').onclick = startCreate
  document.getElementById('sheet').addEventListener('sheetclose', () => {
    if (!creatingPlace) return
    creatingPlace = false
    document.getElementById('addpin').classList.remove('on')
  })
  map.on('style.load', applyMapLanguage)
  map.on('load', applyMapLanguage)

  const loaded = await Promise.all([getBuildings(), getPlaces(), loadItems()])
  buildings = loaded[0]
  fallbackBikes = loaded[1].filter(p => p.type === 'bike').map(p => ({ ...p, live: false }))
  places = loaded[1].filter(p => p.type !== 'bike')
  buildings.forEach(addBuildingPin)
  places.forEach(addPlacePin)
  addMePin()
  buildChips()
  wireCategoryMenu()
  // Pins are created before any filter runs, so apply it once at startup —
  // otherwise everything is visible while the counter reads 0/8.
  filter()
  onLanguageChange(renderLanguage)

  labelsByZoom()
  map.on('zoom', labelsByZoom)
  map.on('moveend', renderBikePins)
  watchMe(p => mePin.setLngLat([p.lng, p.lat]))
  document.getElementById('recenter').onclick = () =>
    map.easeTo({ center: [me.lng, me.lat], zoom: 16.6, pitch: 55, bearing: -18, duration: 800 })
  document.getElementById('sos').onclick = sos

  await refreshYouBike(true)
  setInterval(() => { if (!document.hidden) refreshYouBike(false) }, 60_000)
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshYouBike(false)
  })
}

// MapLibre owns .pin's transform and position — never style either, or the
// marker detaches from the map and stacks at the corner. All our styling and
// the bob animation live on .body inside it.
const pinEl = (cls, inner) => {
  const el = document.createElement('div')
  el.className = 'pin ' + cls
  el.innerHTML = `<div class="body">${inner}<div class="ptail"></div></div>`
  return el
}

function addBuildingPin(b) {
  const n = shown(b).length
  // Same reasoning as places: a building with no visible items stays hidden.
  const el = pinEl('bldg',
    `<div class="ptag">
       <span class="pico">🏛️</span>
       <span class="plbl">${html(localName(b))}</span>
       <span class="pcnt">${n}</span>
     </div>`)
  el.onclick = e => { e.stopPropagation(); openBuilding(b) }
  el.classList.toggle('hide', !n)
  markers[b.buildingId] = new maplibregl.Marker({ element: el, anchor: 'bottom' })
    .setLngLat([b.lng, b.lat]).addTo(map)
}

function addPlacePin(p) {
  const t = TYPES[p.type]
  const label = p.type === 'bike' ? bikeLabel(p) : localName(p)
  const el = pinEl(p.type,
    `<div class="ptag" style="--dot:${t.color}">
       <span class="pico">${p.icon || t.icon}</span>
       <span class="plbl">${html(label)}</span>
     </div>`)
  el.onclick = e => { e.stopPropagation(); openPlace(p) }
  // Student submissions show on the map straight away, marked rather than
  // hidden — nothing anyone contributes is thrown away while it waits.
  // Only an explicit false counts: surveyed places predate this field.
  el.classList.toggle('unverified', p.verified === false)
  // Respect the current filter at creation time. Bike pins are added later, as
  // the viewport moves, and would otherwise appear regardless of the filter.
  el.classList.toggle('hide', !active.has(p.type))
  markers[p.placeId] = new maplibregl.Marker({ element: el, anchor: 'bottom' })
    .setLngLat([p.lng, p.lat]).addTo(map)
}

const bikeLabel = p => p.operating === false ? tr('paused') : `${p.bikes} 🚲`

function renderLanguage() {
  applyMapLanguage()
  buildChips()
  buildings.forEach(b => {
    const label = markers[b.buildingId]?.getElement().querySelector('.plbl')
    if (label) label.textContent = localName(b)
  })
  places.forEach(p => {
    const label = markers[p.placeId]?.getElement().querySelector('.plbl')
    if (label) label.textContent = localName(p)
  })
  renderBikePins()

  if (!document.getElementById('sheet').classList.contains('open')) return
  if (curI) openItem(curI.itemId)
  else if (curB) openBuilding(curB, false)
  else if (curP) openPlace(curP, false)
}

// Basemap labels stay in the local language (Traditional Chinese).
// Measured over the campus bbox: only 16% of OSM features carry name:en and
// 0.3% carry name:ja, so rewriting text-field mostly produced blanks or
// Chinese anyway. We translate OUR pins and the UI; the basemap is Chinese.
function applyMapLanguage() { localizeMapControls() }

function localizeMapControls() {
  const canvas = document.querySelector('#map .maplibregl-canvas')
  if (canvas) canvas.setAttribute('aria-label', tr('mapCanvas'))
  const attribution = document.querySelector('#map .maplibregl-ctrl-attrib-button')
  if (attribution) {
    attribution.title = tr('toggleMapInfo')
    attribution.setAttribute('aria-label', tr('toggleMapInfo'))
  }
}

// Keep only stations in the current viewport. Panning is instant because it
// filters the cached feed; only the one-minute refresh touches the network.
function renderBikePins() {
  if (!map || !allBikeStations.length) return
  const bounds = map.getBounds()
  const center = { lat: map.getCenter().lat, lng: map.getCenter().lng }
  const next = allBikeStations
    .filter(p => bounds.contains([p.lng, p.lat]))
    .sort((a, b) => metres(center, a) - metres(center, b))
    .slice(0, 30)
  const nextIds = new Set(next.map(p => p.placeId))

  bikePlaces.forEach(p => {
    if (nextIds.has(p.placeId)) return
    markers[p.placeId]?.remove()
    delete markers[p.placeId]
  })

  next.forEach(p => {
    const marker = markers[p.placeId]
    if (!marker) {
      addPlacePin(p)
      return
    }
    const el = marker.getElement()
    el.querySelector('.plbl').textContent = bikeLabel(p)
    el.onclick = e => { e.stopPropagation(); openPlace(p) }
    el.classList.toggle('hide', !active.has('bike'))
  })
  bikePlaces = next

  const current = bikePlaces.find(p => p.placeId === curP?.placeId)
  if (current && document.getElementById('sheet').classList.contains('open')) {
    openPlace(current, false)
  }
}

async function refreshYouBike(initial) {
  try {
    allBikeStations = await getYouBikeStations({ force: !initial })
  } catch (error) {
    console.warn('[Freshman Map] live YouBike unavailable', error)
    allBikeStations = allBikeStations.length
      ? allBikeStations.map(p => ({ ...p, live: false }))
      : fallbackBikes
    if (initial) toast(tr('liveBikeError'))
  }
  renderBikePins()
}

// Declutter: labels only once you're zoomed in enough to read them.
function labelsByZoom() {
  const show = map.getZoom() >= 16
  document.getElementById('map').classList.toggle('labels', show)
}

let mePin
function addMePin() {
  const el = document.createElement('div')
  el.className = 'me'
  el.innerHTML = '<div class="body"><div class="ring"></div><div class="dot"></div></div>'
  mePin = new maplibregl.Marker({ element: el }).setLngLat([me.lng, me.lat]).addTo(map)
}

const shown = b => itemsIn(b.buildingId).filter(i => active.has(i.type))

let chipsBuiltOnce = false

function buildChips() {
  const box = document.getElementById('chips')
  // Start collapsed on a fresh page load. Re-renders (for example after a
  // language change) keep the open/closed state the user chose.
  const wasOpen = chipsBuiltOnce
    ? box.querySelector('.category-toggle')?.getAttribute('aria-expanded') === 'true'
    : false
  chipsBuiltOnce = true
  box.innerHTML = `<button type="button" class="category-toggle" aria-expanded="${wasOpen}" aria-controls="category-options">
      <span aria-hidden="true">☰</span>
      <span>${html(tr('categoryMenu'))}</span>
      <span class="category-count">${active.size}/${Object.keys(TYPES).length}</span>
      <span class="category-chevron" aria-hidden="true">›</span>
    </button>
    <div class="category-panel${wasOpen ? ' open' : ''}" id="category-options" role="group" aria-label="${html(tr('categoryMenu'))}">
      <div class="sbhead">
        <div class="sbtitle">${html(tr('categoryMenu'))}</div>
        <button type="button" class="sbclose" id="sb-close" aria-label="${html(tr('close'))}">✕</button>
      </div>
      <div class="sbcats"></div>
    </div>`
  const panel = box.querySelector('.sbcats')
  box.querySelector('#sb-close').onclick = closeCategoryMenu
  Object.entries(TYPES).forEach(([k, type]) => {
    const b = document.createElement('button')
    b.type = 'button'
    b.className = 'chip'; b.dataset.on = active.has(k) ? '1' : '0'
    b.setAttribute('aria-pressed', String(active.has(k)))
    b.innerHTML = `<span>${type.icon}</span>`
    b.append(document.createTextNode(tr(`type.${k}`)))
    b.onclick = () => {
      active.has(k) ? (active.delete(k), b.dataset.on = '0') : (active.add(k), b.dataset.on = '1')
      b.setAttribute('aria-pressed', String(active.has(k)))
      box.querySelector('.category-count').textContent = `${active.size}/${Object.keys(TYPES).length}`
      filter()
    }
    panel.appendChild(b)
  })

  box.querySelector('.category-toggle').onclick = () =>
    setCategoryMenu(box.querySelector('.category-toggle').getAttribute('aria-expanded') !== 'true')

  // buildChips also runs on a language change, so the scrim has to be brought
  // back in step with whatever state the panel was rebuilt in.
  const scrim = document.getElementById('sidebar-scrim')
  if (scrim) scrim.hidden = !wasOpen
}

function setCategoryMenu(open) {
  const box = document.getElementById('chips')
  const toggle = box?.querySelector('.category-toggle')
  if (!toggle) return
  toggle.setAttribute('aria-expanded', String(open))
  box.querySelector('.category-panel')?.classList.toggle('open', open)
  document.getElementById('sidebar-scrim').hidden = !open
}

const closeCategoryMenu = () => setCategoryMenu(false)

function wireCategoryMenu() {
  document.getElementById('sidebar-scrim').onclick = closeCategoryMenu
  document.addEventListener('click', event => {
    const box = document.getElementById('chips')
    if (box.contains(event.target)) return
    closeCategoryMenu()
  })
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeCategoryMenu()
  })
}

function filter() {
  buildings.forEach(b => {
    const n = shown(b).length
    const el = markers[b.buildingId].getElement()
    el.classList.toggle('hide', !n)      // not style.display — MapLibre owns that
    el.querySelector('.pcnt').textContent = n
  })
  ;[...places, ...bikePlaces].forEach(p =>
    markers[p.placeId]?.getElement().classList.toggle('hide', !active.has(p.type)))
  closeSheet()
}

function select(id) {
  document.querySelectorAll('.pin.sel').forEach(n => n.classList.remove('sel'))
  markers[id]?.getElement().classList.add('sel')
}

// --- building → floor directory. No 3D, no floor plans, no indoor positioning.
export function openBuilding(b, move = true) {
  markVisited(b.buildingId)   // counts toward the profile's "visited" stat
  curB = b; curI = null; curP = null
  select(b.buildingId)

  const byFloor = {}
  shown(b).forEach(i => (byFloor[i.floor] ||= []).push(i))

  const floors = Object.keys(byFloor).sort((x, y) => floorOrder(x) - floorOrder(y)).map(f => `
    <div class="floor"><div class="flabel">${f}</div>${byFloor[f].map(i => {
      const t = TYPES[i.type]
      const pill = i.type !== 'toilet' || i.paper === null ? ''
        : i.paper ? `<span class="pill paper-yes">🧻</span>`
                  : `<span class="pill paper-no">🚫</span>`
      return `<div class="item" data-item="${i.itemId}">
        <div class="ic" style="background:${t.color}22">${t.icon}</div>
        <div><div class="tt">${html(tr(`type.${i.type}`))}</div><div class="ss">${html(localText(i.landmark))}</div></div>
        ${pill}<span class="chev">›</span></div>`
    }).join('')}</div>`).join('')

  openSheet(`
    <div class="head">
      <div class="bulb" style="background:#7c8ff233">🏛️</div>
      <div><div class="name">${html(localName(b))}</div><div class="sub">${html(secondaryName(b))}</div></div>
      <div class="dist">${tr('distanceMetres', { count: metres(me, b) })}</div>
    </div>${floors}
    <div class="actions"><button class="btn go" data-nav>🧭 ${tr('takeMe')}</button></div>`)

  wire()
  if (move) map.easeTo({ center: [b.lng, b.lat], offset: [0, -130], duration: 600 })
}

function openItem(itemId) {
  const i = findItem(itemId)
  curI = i; curP = null
  const t = TYPES[i.type]
  openSheet(`
    <div class="head">
      <button class="back" data-back>‹</button>
      <div class="bulb" style="background:${t.color}22">${t.icon}</div>
      <div><div class="name">${tr(`type.${i.type}`)} · ${i.floor}</div><div class="sub">${html(localName(curB))} · ${html(localText(i.note))}</div></div>
    </div>
    ${photoBlock(i)}
    ${i.type === 'toilet' ? paperBlock(i.paper) : ''}
    <div class="actions"><button class="btn go" data-nav>🧭 ${tr('go')}</button></div>`)
  wire()
}

function photoBlock(i) {
  const alt = i.landmark ? localText(i.landmark) : localName(i)
  return i.photo
    ? `<img class="photo" src="${photoUrl(i.photo)}" alt="${html(alt)}"
           data-zoom="${photoUrl(i.photo)}">`
    : `<div class="photo">📷 ${html(alt)}</div>`
}

// We state whether paper is provided. We do not track it live.
function paperBlock(paper) {
  if (paper === null) return `<div class="fact unknown">❓ ${tr('paperUnknown')}</div>`
  return paper
    ? `<div class="fact yes">🧻 ${tr('paperYes')}</div>`
    : `<div class="fact no">🚫 ${tr('paperNo')}</div>`
}

// A question rather than a score. Nobody starts with a rating; it appears only
// once someone who actually went there answers.
function englishBlock(p) {
  const yes = Number(p.yes) || 0
  const no = Number(p.no) || 0
  const total = yes + no
  const mine = myEnglishVote(p.placeId)

  const tally = total
    ? `<div class="engtally">${tr('englishTally', {
        yes, total, pct: Math.round(yes / total * 100)
      })}</div>`
    : `<div class="engtally none">${tr('englishNone')}</div>`

  return `<div class="eng" data-eng="${html(p.placeId)}">
    <div class="engq">${tr('englishAsk')}</div>
    ${tally}
    <div class="engbtns">
      <button type="button" class="engbtn${mine === true ? ' picked' : ''}" data-vote="1">👍 ${tr('englishYes')}</button>
      <button type="button" class="engbtn${mine === false ? ' picked' : ''}" data-vote="0">👎 ${tr('englishNo')}</button>
    </div>
  </div>`
}

function openPlace(p, move = true) {
  curB = null; curI = null; curP = p
  select(p.placeId)
  const t = TYPES[p.type]
  let body = ''

  if (p.type === 'food') {
    // No rating bar. It was never a rating: createPlace() writes yes:1 on
    // every new place, so a restaurant a student added showed "10 / 10 English
    // ordering" that nobody had reported, and the seeded places carried made-up
    // vote counts. Claiming English is spoken somewhere it is not is a bad
    // thing to tell an international student who is already lost.
    //
    // Only show a section when it has content: an empty "tap to show this
    // phrase" promises information we do not have.
    const payments = paymentMethodsOf(p)
    // Guard on the source field, not the localised output: in Japanese
    // localPhrase() returns a "translation unavailable" placeholder, which is
    // truthy, so checking the output would still draw an empty row.
    const phrase = p.say ? localPhrase(p) : ''

    body =
      englishBlock(p) +
      (payments.length ? `<div class="tags payment-tags">${payments.map(method =>
        `<span class="tag t-payment">${html(tr(`payment.${method}`))}</span>`).join('')}</div>` : '') +
      (phrase ? `<div class="say" data-say>💬 <div>${html(phrase)}<small>${html(sayMeaning(p))}</small></div></div>` : '')
  } else if (p.type === 'bike') {
    const pct = p.docks ? Math.min(100, Math.round(p.bikes / p.docks * 100)) : 0
    const updated = p.updatedAt ? p.updatedAt.replace(/^\d{4}-\d{2}-\d{2} /, '') : null
    const electric = p.electricBikes ? tr('electricBikes', { count: p.electricBikes }) : ''
    const status = p.operating === false ? tr('bikeUnavailable')
      : p.live ? tr('updated', { time: updated, electric })
      : updated ? tr('lastUpdated', { time: updated })
      : tr('savedBike')
    body = `<div class="score">
      <div class="stop"><span>${tr('bikesAvailable')}</span>
        <span class="val" style="color:${p.bikes ? '#1f9d6b' : '#e04848'}">${p.bikes} / ${p.docks}</span></div>
      <div class="track"><i style="width:${pct}%;background:${p.bikes ? '#f2c53d' : '#ff6b6b'}"></i></div>
      <div class="stop"><span>${tr('returnDocks')}</span>
        <span class="val" style="color:${p.returns ? '#1f9d6b' : '#e04848'}">${p.returns ?? '—'}</span></div>
      <div class="meta">${status}</div></div>`
  }

  if (p.photo) body += photoBlock(p)

  openSheet(`
    <div class="head">
      <div class="bulb" style="background:${t.color}22">${p.icon || t.icon}</div>
      <div><div class="name">${html(localName(p))}</div><div class="sub">${html(secondaryName(p))}</div></div>
      <div class="dist">${tr('distanceMetres', { count: metres(me, p) })}</div>
    </div>${body}
    <div class="actions"><button class="btn go" data-nav>🧭 ${tr('go')}</button></div>`)

  wire(p)
  if (move) map.easeTo({ center: [p.lng, p.lat], offset: [0, -110], duration: 600 })
}

// 衛生紙 SOS — skips the map entirely. Best-scoring toilets first, then nearest.
function sos() {
  const all = buildings.flatMap(b =>
    itemsIn(b.buildingId).filter(i => i.type === 'toilet' && i.paper === true)
      .map(i => ({ b, i, d: metres(me, b) })))
    .sort((x, y) => x.d - y.d)
    .slice(0, 5)

  openSheet(`
    <div class="head"><div class="bulb" style="background:#ffdede">🧻</div>
      <div><div class="name">${tr('sosName')}</div><div class="sub">${tr('sosSubtitle')}</div></div></div>
    ${all.length ? all.map(x => `<div class="item" data-sos="${x.b.buildingId}|${x.i.itemId}">
      <div class="ic" style="background:#34c98b22">🧻</div>
      <div><div class="tt">${html(localName(x.b))} · ${x.i.floor}</div><div class="ss">${html(localText(x.i.landmark))}</div></div>
      <span class="chev">${tr('distanceMetres', { count: x.d })} ›</span></div>`).join('')
      : `<div class="fact unknown">❓ ${tr('paperNoneKnown')}</div>`}`)
  wire()
}


// One delegated wiring pass per sheet render. Cheaper than tracking listeners.
function wire(place) {
  const s = document.getElementById('sheet')
  s.querySelectorAll('[data-item]').forEach(el => el.onclick = () => openItem(el.dataset.item))
  s.querySelector('[data-back]')?.addEventListener('click', () => openBuilding(curB))
  s.querySelector('[data-say]')?.addEventListener('click', () => toast('「' + localPhrase(place) + '」'))
  s.querySelectorAll('[data-sos]').forEach(el => el.onclick = () => {
    const [bid, iid] = el.dataset.sos.split('|')
    curB = buildings.find(b => b.buildingId === bid)
    openItem(iid)
  })
  s.querySelector('[data-nav]')?.addEventListener('click', () => {
    const target = place || curB
    navTo(target.lat, target.lng, target.navigationTarget || target.address)
  })
  // Tap the photo for the full-size original — the sheet caps it at 38vh.
  s.querySelector('[data-zoom]')?.addEventListener('click', e =>
    window.open(e.currentTarget.dataset.zoom, '_blank'))

  const eng = s.querySelector('[data-eng]')
  if (eng) eng.querySelectorAll('[data-vote]').forEach(b => b.onclick = async () => {
    const ok = b.dataset.vote === '1'
    eng.querySelectorAll('[data-vote]').forEach(x => { x.disabled = true })
    try {
      const updated = await voteEnglish(eng.dataset.eng, ok)
      // Keep the in-memory copy in step so re-opening the sheet shows the new
      // tally rather than the stale one it was rendered from.
      const target = places.find(x => x.placeId === eng.dataset.eng)
      if (target) { target.yes = updated.yes; target.no = updated.no }
      toast(tr(updated.already ? 'englishAlready' : 'englishThanks'))
      if (curP && curP.placeId === eng.dataset.eng) openPlace(target || curP, false)
    } catch (err) {
      console.error('english vote failed', err)
      toast(tr('errGeneric'))
      eng.querySelectorAll('[data-vote]').forEach(x => { x.disabled = false })
    }
  })
}

// --- recommend a place ----------------------------------------------------
// A coordinate sets the saved map location exactly. An address stays as a
// Google Maps destination, so we do not depend on an unreliable free geocoder
// or a manually positioned temporary pin to save a recommendation.
const DIETS = [['veg', 'dietVeg'], ['vegan', 'dietVegan'], ['nopork', 'dietNoPork']]
const RECOMMEND_TYPES = ['food', 'entertainment', 'cat']
const CUISINES = [
  'taiwanese', 'japanese', 'korean', 'nightMarket',
  'vegetarian', 'dessert', 'other'
]

const paymentMethodsOf = place => {
  const methods = Array.isArray(place.paymentMethods)
    ? place.paymentMethods
    : place.cash ? ['cash'] : []
  return methods.filter(method => PAYMENT_METHODS.includes(method))
}

// undefined = this is an address, null = coordinate-shaped but out of range.
const parseCoordinates = value => {
  const match = String(value || '').trim().match(/^(-?\d+(?:\.\d+)?)\s*[,，]\s*(-?\d+(?:\.\d+)?)$/)
  if (!match) return undefined
  const lat = Number(match[1]); const lng = Number(match[2])
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180 ? { lat, lng } : null
}

// Look the place up by name instead of asking someone to eyeball a pin.
//
// A person guessing a location on a map is routinely 30-50m out, which puts a
// restaurant on the wrong side of the street. OSM already knows where these
// are: 424 named places within 1.2km of campus, bundled in poi.js.
//
// Substring match, not fuzzy. Names here are mostly Chinese, where every
// character carries meaning and edit-distance scoring produces nonsense —
// 牛肉麵 and 牛肉飯 differ by one character and are different meals.
function searchPoi(query, limit = 6) {
  const q = query.trim().toLowerCase()
  if (q.length < 1) return []

  const hits = []
  for (const p of POI) {
    const name = p.n.toLowerCase()
    const en = (p.e || '').toLowerCase()
    const at = name.indexOf(q)
    const atEn = en ? en.indexOf(q) : -1
    if (at === -1 && atEn === -1) continue
    // A name starting with what you typed is the one you meant.
    hits.push({ p, rank: at === 0 || atEn === 0 ? 0 : 1, at: at === -1 ? atEn : at })
    if (hits.length > 200) break
  }

  return hits
    .sort((a, b) => a.rank - b.rank || a.at - b.at || a.p.n.length - b.p.n.length)
    .slice(0, limit)
    .map(h => h.p)
}

let creatingPlace = false

function startCreate() {
  if (creatingPlace) return cancelCreate()
  creatingPlace = true
  document.getElementById('addpin').classList.add('on')
  openCreateForm()
}

function cancelCreate() {
  creatingPlace = false
  document.getElementById('addpin').classList.remove('on')
  closeSheet()
}

function openCreateForm() {
  openSheet(`
    <div class="head">
      <div class="bulb" style="background:${TYPES.food.color}22">${TYPES.food.icon}</div>
      <div><div class="name">${tr('addPlace')}</div>
        <div class="sub">${tr('addPlaceDragHint')}</div></div>
    </div>

    <div class="field"><label for="ap-name">${tr('addPlaceName')} *</label>
      <input id="ap-name" type="text" maxlength="60" autocomplete="off"
        role="combobox" aria-expanded="false" aria-controls="ap-hits" aria-autocomplete="list">
      <div class="field-hint">${tr('addPlaceSearchHint')}</div>
      <div class="poihits" id="ap-hits" role="listbox" hidden></div></div>

    <div class="field"><label>${tr('addPlaceCategory')}</label>
      <div class="picker category-picker" id="ap-category">${RECOMMEND_TYPES.map(key => [key, TYPES[key]]).map(([key, type]) =>
        `<button type="button" class="pick wide" data-type="${key}" data-on="${key === 'food' ? 1 : 0}">
          <span>${type.icon}</span>${html(tr(`type.${key}`))}</button>`).join('')}</div></div>

    <div class="field" data-food-field><label>${tr('addPlaceDiet')}</label>
      <div class="picker" id="ap-diet">${DIETS.map(([k, key]) =>
        `<button type="button" class="pick wide" data-diet="${k}" data-on="0">${tr(key)}</button>`).join('')}</div></div>

    <div class="field" data-food-field><label>${tr('addPlaceCuisine')}</label>
      <div class="picker" id="ap-cuisine">${CUISINES.map(cuisine =>
        `<button type="button" class="pick wide" data-cuisine="${cuisine}" data-on="${cuisine === 'other' ? 1 : 0}">
          ${html(tr(`cuisine.${cuisine}`))}</button>`).join('')}</div></div>

    <div class="field"><label>${tr('addPlacePrice')}</label>
      <div class="place-price-inputs">
        <label><span>${tr('minimumPrice')} (NT$)</span><input id="ap-price-min" type="number" min="0" step="10" inputmode="numeric" placeholder="0"></label>
        <span class="price-separator" aria-hidden="true">–</span>
        <label><span>${tr('maximumPrice')} (NT$)</span><input id="ap-price-max" type="number" min="0" step="10" inputmode="numeric" placeholder="500"></label>
      </div>
      <div class="price-error" id="ap-price-error" hidden>${tr('priceRangeInvalid')}</div></div>

    <div class="field" data-food-field><label>${tr('addPlacePayment')}</label>
      <div class="picker" id="ap-payment">${PAYMENT_METHODS.map(method =>
        `<button type="button" class="pick wide" data-payment="${method}" data-on="${method === 'cash' ? 1 : 0}">
          ${html(tr(`payment.${method}`))}</button>`).join('')}</div></div>

    <div class="field"><label for="ap-note">${tr('addPlaceNote')}</label>
      <input id="ap-note" type="text" maxlength="80" autocomplete="off"></div>

    <div class="field" data-food-field><label for="ap-say">${tr('addPlaceSay')}</label>
      <input id="ap-say" type="text" maxlength="80" autocomplete="off" placeholder="一碗牛肉麵，不要香菜"></div>

    <div class="field"><label for="ap-location">${tr('addPlaceLocation')} *</label>
      <input id="ap-location" type="text" maxlength="160" autocomplete="street-address"
        placeholder="${html(tr('addPlaceLocationPlaceholder'))}" required>
      <div class="field-hint">${tr('addPlaceLocationHint')}</div></div>

    <div class="actions">
      <button class="btn ghost" data-ap-cancel>${tr('cancel')}</button>
      <button class="btn go" data-ap-save>${tr('addPlaceSave')}</button>
    </div>`)

  const sheet = document.getElementById('sheet')
  const selectCategory = type => {
    sheet.querySelectorAll('#ap-category .pick').forEach(button => {
      button.dataset.on = button.dataset.type === type ? '1' : '0'
    })
    sheet.querySelectorAll('[data-food-field]').forEach(field => { field.hidden = type !== 'food' })
    const category = TYPES[type]
    sheet.querySelector('.head .bulb').textContent = category.icon
    sheet.querySelector('.head .bulb').style.background = category.color + '22'
  }
  sheet.querySelector('#ap-category').onclick = e => {
    const button = e.target.closest('[data-type]')
    if (button) selectCategory(button.dataset.type)
  }
  selectCategory('food')
  sheet.querySelector('#ap-diet').onclick = e => {          // diet is multi-select
    const b = e.target.closest('[data-diet]'); if (!b) return
    b.dataset.on = b.dataset.on === '1' ? '0' : '1'
  }
  sheet.querySelector('#ap-cuisine').onclick = e => {
    const button = e.target.closest('[data-cuisine]')
    if (!button) return
    sheet.querySelectorAll('#ap-cuisine .pick').forEach(option => { option.dataset.on = '0' })
    button.dataset.on = '1'
  }
  sheet.querySelector('#ap-payment').onclick = e => {
    const button = e.target.closest('[data-payment]')
    if (!button) return
    button.dataset.on = button.dataset.on === '1' ? '0' : '1'
  }

  const locationInput = sheet.querySelector('#ap-location')

  // --- name search ---------------------------------------------------------
  const nameInput = sheet.querySelector('#ap-name')
  const hits = sheet.querySelector('#ap-hits')

  const closeHits = () => {
    hits.hidden = true
    hits.innerHTML = ''
    nameInput.setAttribute('aria-expanded', 'false')
  }

  const pick = p => {
    nameInput.value = p.n
    // The whole point: real coordinates instead of a guessed pin. The location
    // field already accepts "lat,lng", so the save path needs no changes.
    locationInput.value = `${p.lat},${p.lng}`
    if (TYPES[p.t]) selectCategory(p.t)
    closeHits()
    map.easeTo({ center: [p.lng, p.lat], zoom: 17.4, duration: 600 })
    toast(tr('addPlaceFound'))
  }

  // Places already on our map are searched first and cannot be picked — the
  // point of a search box here is to add somewhere new, and OSM has no entry
  // for a lot of what we surveyed (中原夜市 is only a bus stop in OSM, but it
  // is the single most important place in this app). Showing them stops the
  // duplicates that would make the map exactly as messy as we feared.
  const mine = q => {
    const s = q.trim().toLowerCase()
    if (!s) return []
    return places
      .filter(p => String(localName(p) || '').toLowerCase().includes(s)
                || String(p.name || '').toLowerCase().includes(s))
      .slice(0, 3)
  }

  nameInput.oninput = () => {
    const already = mine(nameInput.value)
    // Drop OSM results we already carry, or the same shop is offered twice —
    // once as "already here" and once as something to add again.
    const have = new Set(places.map(p => String(p.name || '').toLowerCase()))
    const found = searchPoi(nameInput.value).filter(p => !have.has(p.n.toLowerCase()))
    if (!already.length && !found.length) return closeHits()

    hits.innerHTML =
      already.map(p => `
        <button type="button" class="poihit have" role="option" data-have="${html(p.placeId)}">
          <span class="poiico">${p.icon || TYPES[p.type]?.icon || '📍'}</span>
          <span class="poitext">
            <span class="poiname">${html(localName(p))}</span>
            <span class="poien">${tr('addPlaceAlready')}</span>
          </span>
          <span class="poidist">${Math.round(metres(map.getCenter(), p))}m</span>
        </button>`).join('') +
      found.map((p, i) => `
        <button type="button" class="poihit" role="option" data-hit="${i}">
          <span class="poiico">${TYPES[p.t]?.icon || '📍'}</span>
          <span class="poitext">
            <span class="poiname">${html(p.n)}</span>
            ${p.e ? `<span class="poien">${html(p.e)}</span>` : ''}
          </span>
          <span class="poidist">${Math.round(metres(map.getCenter(), p))}m</span>
        </button>`).join('')

    hits.hidden = false
    nameInput.setAttribute('aria-expanded', 'true')
    hits.querySelectorAll('[data-hit]').forEach(b =>
      b.onclick = () => pick(found[Number(b.dataset.hit)]))
    hits.querySelectorAll('[data-have]').forEach(b => b.onclick = () => {
      const p = places.find(x => x.placeId === b.dataset.have)
      if (!p) return
      cancelCreate()
      map.easeTo({ center: [p.lng, p.lat], zoom: 17.4, duration: 600 })
      openPlace(p)
    })
  }

  // Typing a name we do not know is normal — it is how a place gets added in
  // the first place. Dismiss quietly and leave the manual field alone.
  nameInput.onkeydown = e => { if (e.key === 'Escape') closeHits() }

  // The other direction: they have the spot, we offer the name.
  //
  // Suggestions, never auto-fill. Shopfronts here are 3-5m wide, so the
  // nearest POI to a dropped pin is often the shop next door — measured
  // against our own places, a straight nearest-match named the neighbour
  // about one time in six. A wrong name nobody notices is worse than a
  // blank field, so the choice stays with the person who was standing there.
  const suggestFromLocation = () => {
    const at = parseCoordinates(locationInput.value)
    if (!at) return                       // undefined = an address, null = out of range
    const near = POI
      .map(p => ({ p, d: metres(at, p) }))
      .filter(x => x.d <= 60)
      .sort((a, b) => a.d - b.d)
      .slice(0, 4)
    if (!near.length) return closeHits()

    hits.innerHTML = `<div class="poilabel">${tr('addPlaceNearby')}</div>` +
      near.map(({ p, d }, i) => `
        <button type="button" class="poihit" role="option" data-near="${i}">
          <span class="poiico">${TYPES[p.t]?.icon || '📍'}</span>
          <span class="poitext"><span class="poiname">${html(p.n)}</span>
            ${p.e ? `<span class="poien">${html(p.e)}</span>` : ''}</span>
          <span class="poidist">${Math.round(d)}m</span>
        </button>`).join('')
    hits.hidden = false
    hits.querySelectorAll('[data-near]').forEach(b => b.onclick = () => {
      const { p } = near[Number(b.dataset.near)]
      nameInput.value = p.n
      if (TYPES[p.t]) selectCategory(p.t)
      closeHits()
    })
  }
  locationInput.addEventListener('input', suggestFromLocation)

  const priceMinInput = sheet.querySelector('#ap-price-min')
  const priceMaxInput = sheet.querySelector('#ap-price-max')
  const readPriceRange = () => {
    const minText = priceMinInput.value.trim(); const maxText = priceMaxInput.value.trim()
    if (!minText && !maxText) {
      priceMinInput.setAttribute('aria-invalid', 'false')
      priceMaxInput.setAttribute('aria-invalid', 'false')
      sheet.querySelector('#ap-price-error').hidden = true
      return { valid: true, min: null, max: null }
    }
    const min = Number(minText); const max = Number(maxText)
    const valid = minText !== '' && maxText !== '' && Number.isFinite(min) && Number.isFinite(max) && min >= 0 && max >= min
    priceMinInput.setAttribute('aria-invalid', String(!valid))
    priceMaxInput.setAttribute('aria-invalid', String(!valid))
    sheet.querySelector('#ap-price-error').hidden = valid
    return { valid, min, max }
  }
  priceMinInput.oninput = readPriceRange
  priceMaxInput.oninput = readPriceRange

  sheet.querySelector('[data-ap-cancel]').onclick = cancelCreate
  sheet.querySelector('[data-ap-save]').onclick = async () => {
    const name = sheet.querySelector('#ap-name').value.trim()
    if (!name) return toast(tr('addPlaceNeedName'))
    const type = sheet.querySelector('#ap-category [data-on="1"]').dataset.type
    const location = locationInput.value.trim()
    if (!location) return toast(tr('addPlaceNeedLocation'))
    const coordinates = parseCoordinates(location)
    if (coordinates === null) return toast(tr('addPlaceInvalidCoordinates'))
    const priceRange = readPriceRange()
    if (!priceRange.valid) return toast(tr('priceRangeInvalid'))
    const pos = coordinates || map.getCenter()
    const place = await createPlace({
      name,
      type,
      icon: TYPES[type].icon,
      priceMin: priceRange.min,
      priceMax: priceRange.max,
      cuisine: type === 'food' ? sheet.querySelector('#ap-cuisine [data-on="1"]').dataset.cuisine : '',
      paymentMethods: type === 'food' ? [...sheet.querySelectorAll('#ap-payment [data-on="1"]')].map(b => b.dataset.payment) : [],
      diet: type === 'food' ? [...sheet.querySelectorAll('#ap-diet [data-on="1"]')].map(b => b.dataset.diet) : [],
      note: sheet.querySelector('#ap-note').value.trim(),
      say: type === 'food' ? sheet.querySelector('#ap-say').value.trim() : '',
      address: coordinates ? '' : location,
      navigationTarget: location,
      lat: pos.lat, lng: pos.lng
    })
    creatingPlace = false
    document.getElementById('addpin').classList.remove('on')
    places.push(place)
    active.add(place.type)
    buildChips()
    addPlacePin(place)
    filter()
    closeSheet()
    toast(tr('addPlaceDone'))
  }
}

export const resizeMap = () => map?.resize()
