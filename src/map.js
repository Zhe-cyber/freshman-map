// OWNER: A — map screen only. Nobody else edits this file.
import { TYPES } from './data.js'
import {
  campus, me, getBuildings, getPlaces, createPlace, loadItems, itemsIn, findItem,
  getYouBikeStations, metres, floorOrder, navTo, watchMe
} from './api.js'
import { openSheet, closeSheet, toast, scoreBar } from './ui.js'
import { localName, localPhrase, localText, onLanguageChange, sayMeaning, secondaryName, t as tr } from './i18n.js'

let map, markers = {}, buildings = [], places = [], bikePlaces = [], fallbackBikes = []
let allBikeStations = [], curB = null, curI = null, curP = null
const active = new Set(Object.keys(TYPES))
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
  map.on('click', () => { if (!draftMarker) closeSheet() })
  document.getElementById('addpin').onclick = startCreate
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
  const el = pinEl('bldg',
    `<div class="ptag">
       <span class="pico">🏛️</span>
       <span class="plbl">${html(localName(b))}</span>
       <span class="pcnt">${n}</span>
     </div>`)
  el.onclick = e => { e.stopPropagation(); openBuilding(b) }
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

function buildChips() {
  const box = document.getElementById('chips')
  box.innerHTML = ''
  Object.entries(TYPES).forEach(([k, type]) => {
    const b = document.createElement('button')
    b.className = 'chip'; b.dataset.on = active.has(k) ? '1' : '0'
    b.innerHTML = `<span>${type.icon}</span>`
    b.append(document.createTextNode(tr(`type.${k}`)))
    b.onclick = () => {
      active.has(k) ? (active.delete(k), b.dataset.on = '0') : (active.add(k), b.dataset.on = '1')
      filter()
    }
    box.appendChild(b)
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
  return i.photo
    ? `<img class="photo" src="photos/${encodeURIComponent(i.photo)}" alt="${html(localText(i.landmark))}"
           loading="lazy" data-zoom="photos/${encodeURIComponent(i.photo)}">`
    : `<div class="photo">📷 ${html(localText(i.landmark))}</div>`
}

// We state whether paper is provided. We do not track it live.
function paperBlock(paper) {
  if (paper === null) return `<div class="fact unknown">❓ ${tr('paperUnknown')}</div>`
  return paper
    ? `<div class="fact yes">🧻 ${tr('paperYes')}</div>`
    : `<div class="fact no">🚫 ${tr('paperNo')}</div>`
}

function openPlace(p, move = true) {
  curB = null; curI = null; curP = p
  select(p.placeId)
  const t = TYPES[p.type]
  let body = ''

  if (p.type === 'food') {
    body = scoreBar(tr('englishOkay'), p, '#ff8a3d') +
      `<div class="say" data-say>💬 <div>${html(localPhrase(p))}<small>${html(sayMeaning(p))}</small></div></div>`
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
    navTo(target.lat, target.lng)
  })
  // Tap the photo for the full-size original — the sheet caps it at 38vh.
  s.querySelector('[data-zoom]')?.addEventListener('click', e =>
    window.open(e.currentTarget.dataset.zoom, '_blank'))
}

// --- recommend a place ----------------------------------------------------
// Position comes from a draggable pin, not an address: free geocoders put
// CYCU's own street address in Keelung, 60km away. Dragging is also more
// precise than a single tap, and the form stays open while you adjust.
const ICONS = ['⭐', '🍜', '🍚', '🍢', '🍮', '🧋', '🍞', '🥗', '🍗', '🍲']
const DIETS = [['veg', 'dietVeg'], ['vegan', 'dietVegan'], ['nopork', 'dietNoPork'], ['ask', 'dietAsk']]

let draftMarker = null

function startCreate() {
  if (draftMarker) return cancelCreate()
  const c = map.getCenter()
  const el = document.createElement('div')
  el.className = 'pin draft'
  el.innerHTML = `<div class="body"><div class="ptag" style="--dot:#ff8a3d">
      <span class="pico">📍</span></div><div class="ptail"></div></div>`
  draftMarker = new maplibregl.Marker({ element: el, anchor: 'bottom', draggable: true })
    .setLngLat(c).addTo(map)
  draftMarker.on('drag', () => {
    const { lng, lat } = draftMarker.getLngLat()
    const out = document.getElementById('ap-coords')
    if (out) out.textContent = `${lat.toFixed(5)}, ${lng.toFixed(5)}`
  })
  document.getElementById('addpin').classList.add('on')
  openCreateForm()
}

function cancelCreate() {
  draftMarker?.remove()
  draftMarker = null
  document.getElementById('addpin').classList.remove('on')
  closeSheet()
}

function openCreateForm() {
  const { lng, lat } = draftMarker.getLngLat()
  openSheet(`
    <div class="head">
      <div class="bulb" style="background:#ff8a3d22">⭐</div>
      <div><div class="name">${tr('addPlace')}</div>
        <div class="sub">${tr('addPlaceDragHint')}</div></div>
    </div>

    <div class="field"><label for="ap-name">${tr('addPlaceName')} *</label>
      <input id="ap-name" type="text" maxlength="60" autocomplete="off"></div>

    <div class="field"><label>${tr('addPlaceIcon')}</label>
      <div class="picker" id="ap-icons">${ICONS.map((i, n) =>
        `<button type="button" class="pick" data-icon="${i}" data-on="${n === 0 ? 1 : 0}">${i}</button>`).join('')}</div></div>

    <div class="field"><label>${tr('addPlaceDiet')}</label>
      <div class="picker" id="ap-diet">${DIETS.map(([k, key]) =>
        `<button type="button" class="pick wide" data-diet="${k}" data-on="0">${tr(key)}</button>`).join('')}</div></div>

    <div class="field"><label>${tr('addPlacePrice')}</label>
      <div class="picker" id="ap-price">${[1, 2, 3].map(n =>
        `<button type="button" class="pick wide" data-price="${n}" data-on="${n === 1 ? 1 : 0}">${'$'.repeat(n)}</button>`).join('')}</div></div>

    <div class="field"><label for="ap-note">${tr('addPlaceNote')}</label>
      <input id="ap-note" type="text" maxlength="80" autocomplete="off"></div>

    <div class="field"><label for="ap-say">${tr('addPlaceSay')}</label>
      <input id="ap-say" type="text" maxlength="80" autocomplete="off" placeholder="一碗牛肉麵，不要香菜"></div>

    <div class="field"><label for="ap-addr">${tr('addPlaceAddress')}</label>
      <input id="ap-addr" type="text" maxlength="90" autocomplete="off"></div>

    <div class="coords">📍 <span id="ap-coords">${lat.toFixed(5)}, ${lng.toFixed(5)}</span></div>

    <div class="actions">
      <button class="btn ghost" data-ap-cancel>${tr('cancel')}</button>
      <button class="btn go" data-ap-save>${tr('addPlaceSave')}</button>
    </div>`)

  const sheet = document.getElementById('sheet')
  const pickOne = (id, attr) => sheet.querySelector(id).onclick = e => {
    const b = e.target.closest('[data-' + attr + ']'); if (!b) return
    sheet.querySelectorAll(`#${id.slice(1)} .pick`).forEach(x => x.dataset.on = '0')
    b.dataset.on = '1'
  }
  pickOne('#ap-icons', 'icon'); pickOne('#ap-price', 'price')
  sheet.querySelector('#ap-diet').onclick = e => {          // diet is multi-select
    const b = e.target.closest('[data-diet]'); if (!b) return
    b.dataset.on = b.dataset.on === '1' ? '0' : '1'
  }

  sheet.querySelector('[data-ap-cancel]').onclick = cancelCreate
  sheet.querySelector('[data-ap-save]').onclick = async () => {
    const name = sheet.querySelector('#ap-name').value.trim()
    if (!name) return toast(tr('addPlaceNeedName'))
    const pos = draftMarker.getLngLat()
    const place = await createPlace({
      name,
      icon: sheet.querySelector('#ap-icons [data-on="1"]').dataset.icon,
      price: +sheet.querySelector('#ap-price [data-on="1"]').dataset.price,
      diet: [...sheet.querySelectorAll('#ap-diet [data-on="1"]')].map(b => b.dataset.diet),
      note: sheet.querySelector('#ap-note').value.trim(),
      say: sheet.querySelector('#ap-say').value.trim(),
      address: sheet.querySelector('#ap-addr').value.trim(),
      lat: pos.lat, lng: pos.lng
    })
    draftMarker.remove(); draftMarker = null
    document.getElementById('addpin').classList.remove('on')
    places.push(place)
    addPlacePin(place)
    closeSheet()
    toast(tr('addPlaceDone'))
  }
}

export const resizeMap = () => map?.resize()
