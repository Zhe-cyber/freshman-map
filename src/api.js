// Contract layer. Nobody else calls fetch().
// Empty API_BASE = mock mode. CLOUD sets it on Day 2, FRONT changes nothing.
import { MOCK } from './data.js'

const API_BASE = ''   // ← CLOUD: put the API Gateway URL here on Day 2

// Multi-tenant backdoor: ?campus=ntu switches campus. 3 lines, whole demo.
export const campusId = new URLSearchParams(location.search).get('campus') || 'cycu'
export const usingMock = !API_BASE

export const CAMPUSES = {
  cycu: { name: '中原大學', en: 'Chung Yuan Christian University', center: [121.2422, 24.9572], zoom: 15.4 },
  ntu:  { name: '國立臺灣大學', en: 'National Taiwan University', center: [121.5395, 25.0174], zoom: 15.4 }
}
export const campus = CAMPUSES[campusId] || CAMPUSES.cycu

// Where the user is. Real GPS overwrites this via watchMe().
export const me = { lat: 24.9563, lng: 121.2418 }

async function call(path, options) {
  const r = await fetch(`${API_BASE}/c/${campusId}${path}`, {
    headers: { 'Content-Type': 'application/json' }, ...options
  })
  if (!r.ok) throw new Error(`${r.status} ${path}`)
  return r.json()
}

export const getBuildings  = () => usingMock ? MOCK.buildings  : call('/buildings')
export const getPlaces     = () => usingMock ? MOCK.places     : call('/places')
export const getActivities = () => usingMock ? MOCK.activities : call('/activities')

// All items in one call, cached. ~50 records — an endpoint per building would
// be an N+1 for no gain, and a sync filter keeps callers off async.
let itemCache = null
export async function loadItems() {
  itemCache = usingMock ? MOCK.items : await call('/items')
  return itemCache
}
export function itemsIn(buildingId) {
  if (!itemCache) throw new Error('call loadItems() first')
  return itemCache.filter(i => i.buildingId === buildingId)
}
export const findItem = itemId => itemCache.find(i => i.itemId === itemId)

// value: true = 有紙, false = 沒紙. Returns the new reliability object.
export function reportItem(itemId, value) {
  if (!usingMock) return call('/reports', { method: 'POST', body: JSON.stringify({ itemId, value }) })
  const r = MOCK.items.find(i => i.itemId === itemId).reliability
  value ? r.yes++ : r.no++
  r.score = r.yes / (r.yes + r.no)
  r.lastReportAt = new Date().toISOString()
  return { ...r, xpGained: 10 }
}

export function joinActivity(activityId) {
  if (!usingMock) return call(`/activities/${activityId}/join`, { method: 'POST' })
  const a = MOCK.activities.find(x => x.activityId === activityId)
  if (a.joinedByMe) { a.joinedByMe = false; a.joined-- }
  else if (a.joined < a.capacity) { a.joinedByMe = true; a.joined++ }
  else return { full: true, ...a }
  return a
}

export function createActivity(title) {
  const a = { campusId, activityId: 'a' + Date.now(), icon: '🎉', title,
    place: '中原夜市', when: '今晚 tonight', hostName: 'You',
    capacity: 4, joined: 1, joinedByMe: true }
  if (!usingMock) return call('/activities', { method: 'POST', body: JSON.stringify(a) })
  MOCK.activities.unshift(a)
  return a
}

// --- shared helpers ---------------------------------------------------------

export function metres(a, b) {
  const R = 6371000, rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad, dLng = (b.lng - a.lng) * rad
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return Math.round(2 * R * Math.asin(Math.sqrt(h)))
}

export const floorOrder = f => f[0] === 'B' ? -parseInt(f.slice(1), 10) : parseInt(f, 10)
export const score = r => Math.round(r.yes / (r.yes + r.no) * 100)
export const tone = p => p >= 60 ? '#34c98b' : p >= 35 ? '#f2c53d' : '#ff6b6b'
export const toneText = p => p >= 60 ? '#1f9d6b' : p >= 35 ? '#a8730a' : '#e04848'

export const navTo = (lat, lng) =>
  window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank')

// Real GPS. Falls back silently to the hardcoded campus position.
export function watchMe(onMove) {
  if (!navigator.geolocation) return
  navigator.geolocation.watchPosition(
    p => { me.lat = p.coords.latitude; me.lng = p.coords.longitude; onMove?.(me) },
    () => {}, { enableHighAccuracy: true, maximumAge: 10000 }
  )
}
