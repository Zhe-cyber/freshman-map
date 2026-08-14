// OWNER: A — map screen only. Nobody else edits this file.
import { TYPES } from './data.js'
import {
  campus, me, getBuildings, getPlaces, loadItems, itemsIn, findItem, reportItem,
  getYouBikeStations, metres, floorOrder, score, tone, toneText, navTo, watchMe
} from './api.js'
import { openSheet, closeSheet, toast, scoreBar } from './ui.js'
import { getLanguage, localName, localPhrase, localText, onLanguageChange, sayMeaning, secondaryName, t as tr } from './i18n.js'

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
  map.on('click', closeSheet)
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

// OpenFreeMap uses OpenStreetMap vector labels, unlike raster tiles whose text
// is baked into an image. Only name-based layers are changed: route numbers,
// road shields and icons keep the style's original expressions.
// Every chain MUST end in `name` (the local Traditional Chinese). Only 16% of
// features around CYCU carry name:en and 0.3% carry name:ja, so without that
// last fallback most labels render blank — worse than showing Chinese, and in
// Japanese it empties the map. Measured against Overpass over the campus bbox.
const mapNameFields = {
  // Both campuses are in Taiwan, so the local `name` is Traditional Chinese.
  'zh-Hant': ['name:zh-Hant', 'name:zh-TW', 'name', 'name:nonlatin', 'name:zh'],
  en: ['name:en', 'name_en', 'name:latin', 'name'],
  ja: ['name:ja', 'name_ja', 'name:latin', 'name']
}

function applyMapLanguage() {
  localizeMapControls()
  if (!map?.isStyleLoaded()) return
  const fields = mapNameFields[getLanguage()] || mapNameFields.en
  const textField = ['coalesce', ...fields.map(field => ['get', field]), '']

  map.getStyle().layers.forEach(layer => {
    const original = layer.layout?.['text-field']
    if (layer.type !== 'symbol' || !original || !/name[:_"\]]/.test(JSON.stringify(original))) return
    map.setLayoutProperty(layer.id, 'text-field', textField)
  })
}

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
      const pill = i.reliability
        ? `<span class="pill" style="background:${tone(score(i.reliability))}22;color:${toneText(score(i.reliability))}">${Math.round(score(i.reliability) / 10)}/10</span>` : ''
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
    <div class="photo">📷 ${html(localText(i.landmark))}</div>
    ${i.reliability ? scoreBar(tr('hasPaper'), i.reliability) +
      `<div class="actions">
         <button class="btn yes" data-report="1">${tr('hasPaperYes')}</button>
         <button class="btn no" data-report="0">${tr('hasPaperNo')}</button></div>` : ''}
    <div class="actions"><button class="btn go" data-nav>🧭 ${tr('go')}</button></div>`)
  wire()
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
    itemsIn(b.buildingId).filter(i => i.type === 'toilet' && i.reliability)
      .map(i => ({ b, i, d: metres(me, b), p: score(i.reliability) })))
    .filter(x => x.p >= 50)
    .sort((x, y) => y.p - x.p || x.d - y.d)
    .slice(0, 4)

  openSheet(`
    <div class="head"><div class="bulb" style="background:#ffdede">🧻</div>
      <div><div class="name">${tr('sosName')}</div><div class="sub">${tr('sosSubtitle')}</div></div></div>
    ${all.map(x => `<div class="item" data-sos="${x.b.buildingId}|${x.i.itemId}">
      <div class="ic" style="background:#34c98b22">🧻</div>
      <div><div class="tt">${html(localName(x.b))} · ${x.i.floor}</div><div class="ss">${html(localText(x.i.landmark))}</div></div>
      <span class="pill" style="background:${tone(x.p)}22;color:${toneText(x.p)}">${Math.round(x.p / 10)}/10</span>
      <span class="chev">${tr('distanceMetres', { count: x.d })} ›</span></div>`).join('')}`)
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
  s.querySelectorAll('[data-report]').forEach(el => el.onclick = async () => {
    const ok = el.dataset.report === '1'
    await reportItem(curI.itemId, ok)
    openItem(curI.itemId)
    toast(ok ? tr('reportThanks') : tr('reportRecorded'))
  })
  s.querySelector('[data-nav]')?.addEventListener('click', () => {
    const target = place || curB
    navTo(target.lat, target.lng)
  })
}

export const resizeMap = () => map?.resize()
