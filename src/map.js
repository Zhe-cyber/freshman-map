// OWNER: A — map screen only. Nobody else edits this file.
import { TYPES } from './data.js'
import {
  campus, me, getBuildings, getPlaces, loadItems, itemsIn, findItem, reportItem,
  metres, floorOrder, score, tone, toneText, navTo, watchMe
} from './api.js'
import { openSheet, closeSheet, toast, scoreBar } from './ui.js'

let map, markers = {}, buildings = [], places = [], curB = null, curI = null
const active = new Set(Object.keys(TYPES))

export async function initMap() {
  map = new maplibregl.Map({
    container: 'map',
    center: campus.center,
    zoom: campus.zoom,
    pitch: 55,             // the tilt is what makes it read as a game, not Google Maps
    bearing: -18,
    attributionControl: { compact: true },
    style: {
      version: 8,
      sources: { osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
                        tileSize: 256, attribution: '© OpenStreetMap contributors' } },
      layers: [{ id: 'osm', type: 'raster', source: 'osm' }]
    }
  })
  map.on('click', closeSheet)

  ;[buildings, places] = await Promise.all([getBuildings(), getPlaces(), loadItems()])
  buildings.forEach(addBuildingPin)
  places.forEach(addPlacePin)
  addMePin()
  buildChips()

  labelsByZoom()
  map.on('zoom', labelsByZoom)
  watchMe(p => mePin.setLngLat([p.lng, p.lat]))
  document.getElementById('recenter').onclick = () =>
    map.easeTo({ center: [me.lng, me.lat], zoom: 16.6, pitch: 55, bearing: -18, duration: 800 })
  document.getElementById('sos').onclick = sos
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
       <span class="plbl">${b.name}</span>
       <span class="pcnt">${n}</span>
     </div>`)
  el.onclick = e => { e.stopPropagation(); openBuilding(b) }
  markers[b.buildingId] = new maplibregl.Marker({ element: el, anchor: 'bottom' })
    .setLngLat([b.lng, b.lat]).addTo(map)
}

function addPlacePin(p) {
  const t = TYPES[p.type]
  const label = p.type === 'bike' ? `${p.bikes} 🚲` : p.name
  const el = pinEl(p.type,
    `<div class="ptag" style="--dot:${t.color}">
       <span class="pico">${p.icon || t.icon}</span>
       <span class="plbl">${label}</span>
     </div>`)
  el.onclick = e => { e.stopPropagation(); openPlace(p) }
  markers[p.placeId] = new maplibregl.Marker({ element: el, anchor: 'bottom' })
    .setLngLat([p.lng, p.lat]).addTo(map)
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
  Object.entries(TYPES).forEach(([k, t]) => {
    const b = document.createElement('button')
    b.className = 'chip'; b.dataset.on = '1'
    b.innerHTML = `<span>${t.icon}</span>${t.label}`
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
  places.forEach(p => markers[p.placeId].getElement().classList.toggle('hide', !active.has(p.type)))
  closeSheet()
}

function select(id) {
  document.querySelectorAll('.pin.sel').forEach(n => n.classList.remove('sel'))
  markers[id]?.getElement().classList.add('sel')
}

// --- building → floor directory. No 3D, no floor plans, no indoor positioning.
export function openBuilding(b) {
  curB = b; curI = null
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
        <div><div class="tt">${t.label} ${t.en}</div><div class="ss">${i.landmark}</div></div>
        ${pill}<span class="chev">›</span></div>`
    }).join('')}</div>`).join('')

  openSheet(`
    <div class="head">
      <div class="bulb" style="background:#7c8ff233">🏛️</div>
      <div><div class="name">${b.name}</div><div class="sub">${b.en}</div></div>
      <div class="dist">${metres(me, b)} m<small>away</small></div>
    </div>${floors}
    <div class="actions"><button class="btn go" data-nav>🧭 帶我去這棟 Take me there</button></div>`)

  wire()
  map.easeTo({ center: [b.lng, b.lat], offset: [0, -130], duration: 600 })
}

function openItem(itemId) {
  const i = findItem(itemId)
  curI = i
  const t = TYPES[i.type]
  openSheet(`
    <div class="head">
      <button class="back" data-back>‹</button>
      <div class="bulb" style="background:${t.color}22">${t.icon}</div>
      <div><div class="name">${t.label} · ${i.floor}</div><div class="sub">${curB.name} · ${i.note}</div></div>
    </div>
    <div class="photo">📷 ${i.landmark}</div>
    ${i.reliability ? scoreBar('有衛生紙 · has paper', i.reliability) +
      `<div class="actions">
         <button class="btn yes" data-report="1">有紙</button>
         <button class="btn no" data-report="0">沒紙</button></div>` : ''}
    <div class="actions"><button class="btn go" data-nav>🧭 Go</button></div>`)
  wire()
}

function openPlace(p) {
  curB = null; curI = null
  select(p.placeId)
  const t = TYPES[p.type]
  let body = ''

  if (p.type === 'food') {
    body = scoreBar('可以用英文點餐 · English OK', p, '#ff8a3d') +
      `<div class="say" data-say>💬 <div>${p.say}<small>${p.sayEn}</small></div></div>`
  } else if (p.type === 'bike') {
    const pct = Math.round(p.bikes / p.docks * 100)
    body = `<div class="score">
      <div class="stop"><span>可借車輛 · bikes available</span>
        <span class="val" style="color:${p.bikes ? '#1f9d6b' : '#e04848'}">${p.bikes} / ${p.docks}</span></div>
      <div class="track"><i style="width:${pct}%;background:${p.bikes ? '#f2c53d' : '#ff6b6b'}"></i></div>
      <div class="meta">Live from YouBike open data</div></div>`
  }

  openSheet(`
    <div class="head">
      <div class="bulb" style="background:${t.color}22">${p.icon || t.icon}</div>
      <div><div class="name">${p.name}</div><div class="sub">${p.en}</div></div>
      <div class="dist">${metres(me, p)} m<small>away</small></div>
    </div>${body}
    <div class="actions"><button class="btn go" data-nav>🧭 Go</button></div>`)

  wire(p)
  map.easeTo({ center: [p.lng, p.lat], offset: [0, -110], duration: 600 })
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
      <div><div class="name">衛生紙 SOS</div><div class="sub">Closest toilets that actually have paper</div></div></div>
    ${all.map(x => `<div class="item" data-sos="${x.b.buildingId}|${x.i.itemId}">
      <div class="ic" style="background:#34c98b22">🧻</div>
      <div><div class="tt">${x.b.name} · ${x.i.floor}</div><div class="ss">${x.i.landmark}</div></div>
      <span class="pill" style="background:${tone(x.p)}22;color:${toneText(x.p)}">${Math.round(x.p / 10)}/10</span>
      <span class="chev">${x.d}m ›</span></div>`).join('')}`)
  wire()
}

// One delegated wiring pass per sheet render. Cheaper than tracking listeners.
function wire(place) {
  const s = document.getElementById('sheet')
  s.querySelectorAll('[data-item]').forEach(el => el.onclick = () => openItem(el.dataset.item))
  s.querySelector('[data-back]')?.addEventListener('click', () => openBuilding(curB))
  s.querySelector('[data-say]')?.addEventListener('click', () => toast('「' + place.say + '」'))
  s.querySelectorAll('[data-sos]').forEach(el => el.onclick = () => {
    const [bid, iid] = el.dataset.sos.split('|')
    curB = buildings.find(b => b.buildingId === bid)
    openItem(iid)
  })
  s.querySelectorAll('[data-report]').forEach(el => el.onclick = async () => {
    const ok = el.dataset.report === '1'
    await reportItem(curI.itemId, ok)
    openItem(curI.itemId)
    toast(ok ? '謝謝！+10 XP 🎉' : '記錄了，謝謝 🙏')
  })
  s.querySelector('[data-nav]')?.addEventListener('click', () => {
    const target = place || curB
    navTo(target.lat, target.lng)
  })
}

export const resizeMap = () => map?.resize()
