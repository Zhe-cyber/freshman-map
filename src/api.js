// Contract layer. Nobody else calls fetch().
// Empty API_BASE = mock mode. CLOUD sets it on Day 2, FRONT changes nothing.
import { MOCK } from './data.js'

const API_BASE = 'https://wfzwyfnffg.execute-api.us-east-1.amazonaws.com'
const YOUBIKE_URL = 'https://apis.youbike.com.tw/json/station-yb2.json'

// Multi-tenant backdoor: ?campus=ntu switches campus. 3 lines, whole demo.
export const campusId = new URLSearchParams(location.search).get('campus') || 'cycu'
export const usingMock = !API_BASE

export const CAMPUSES = {
  cycu: { name: '中原大學', en: 'Chung Yuan Christian University', center: [121.2422, 24.9572], zoom: 15.4 },
  ntu:  { name: '國立臺灣大學', en: 'National Taiwan University', center: [121.5395, 25.0174], zoom: 15.4 }
}
export const campus = CAMPUSES[campusId] || CAMPUSES.cycu

// Where the survey photos live. 'photos/' serves them out of the repo; after
// infra/deploy-photos.sh, point this at the bucket. data.js keeps storing bare
// filenames either way, so switching costs one line and no records change.
const PHOTO_BASE = 'photos/'
export const photoUrl = file => file ? PHOTO_BASE + encodeURIComponent(file) : null

// Identity, not authentication. BuddyUp needs to know which person joined —
// it does not need them to prove it. A device id plus a name they type once
// covers every screen we have. Cognito can replace this later without any
// caller changing: keep returning { userId, name }.
import { currentUser } from './auth.js'

const ID_KEY = 'freshmanmap.user'
const deviceUser = (() => {
  try {
    const saved = JSON.parse(localStorage.getItem(ID_KEY))
    if (saved?.userId) return saved
  } catch {}
  const fresh = { userId: 'u-' + crypto.randomUUID().slice(0, 8), name: '' }
  localStorage.setItem(ID_KEY, JSON.stringify(fresh))
  return fresh
})()

// A signed-in Cognito user wins; otherwise the device identity keeps the app
// usable for anyone who skipped the login gate.
export const user = currentUser() || deviceUser

export function setUserName(name) {
  deviceUser.name = name.trim()
  localStorage.setItem(ID_KEY, JSON.stringify(deviceUser))
  return deviceUser
}

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
// User recommendations live in localStorage until CLOUD ships POST /places.
// Same shape as MOCK.places, so nothing downstream knows the difference.
const ADDED_KEY = 'freshmanmap.added.' + campusId
const added = () => { try { return JSON.parse(localStorage.getItem(ADDED_KEY)) || [] } catch { return [] } }

export const getPlaces = () => usingMock ? [...MOCK.places, ...added()] : call('/places')

export async function createPlace(draft) {
  const place = {
    campusId,
    placeId: 'user-' + Date.now(),
    type: 'food',
    icon: draft.icon || '⭐',
    name: draft.name,
    en: draft.name,
    address: draft.address || '',
    note: draft.note || '',
    say: draft.say || '',
    sayEn: '',
    lat: draft.lat, lng: draft.lng,
    price: draft.price || 1,
    diet: draft.diet?.length ? draft.diet : ['ask'],
    cash: draft.cash !== false,
    yes: 1, no: 0,                     // the person who added it vouches for it
    addedByUser: true
  }
  if (!usingMock) return call('/places', { method: 'POST', body: JSON.stringify(place) })
  const all = [...added(), place]
  localStorage.setItem(ADDED_KEY, JSON.stringify(all))
  return place
}
export const getActivities = async () => {
  if (usingMock) return MOCK.activities
  const list = await call('/activities')
  return list.map(a => ({ ...a, joinedByMe: (a.joinedBy || []).includes(user.userId) }))
}

// The official YouBike feed now permits browser requests (CORS: *), so bike
// availability can stay live even while the rest of the app uses mock data.
// Cache briefly because map pans should never re-download the ~9k-station feed.
let youBikeCache = null
let youBikeFetchedAt = 0
export async function getYouBikeStations({ force = false } = {}) {
  if (!force && youBikeCache && Date.now() - youBikeFetchedAt < 55_000) return youBikeCache

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)
  try {
    const r = await fetch(YOUBIKE_URL, { cache: 'no-cache', signal: controller.signal })
    if (!r.ok) throw new Error(`YouBike ${r.status}`)
    const data = await r.json()
    if (!Array.isArray(data)) throw new Error('Unexpected YouBike response')

    youBikeCache = data.map(s => ({
      placeId: `yb-${s.station_no}`,
      type: 'bike',
      name: s.name_tw,
      en: `${s.name_en || 'YouBike'} · ${s.station_no}`,
      address: s.address_tw,
      stationNo: s.station_no,
      lat: Number(s.lat),
      lng: Number(s.lng),
      bikes: Number(s.available_spaces) || 0,
      electricBikes: Number(s.available_spaces_detail?.eyb) || 0,
      returns: Number(s.empty_spaces) || 0,
      docks: Number(s.parking_spaces) || 0,
      operating: Number(s.status) === 1,
      updatedAt: s.updated_at,
      live: true
    })).filter(s => Number.isFinite(s.lat) && Number.isFinite(s.lng))
    youBikeFetchedAt = Date.now()
    return youBikeCache
  } finally {
    clearTimeout(timeout)
  }
}

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
  // The server needs to know who joined — that is what makes the counter
  // shared across devices instead of a number on one phone.
  if (!usingMock) return call(`/activities/${activityId}/join`,
    { method: 'POST', body: JSON.stringify({ userId: user.userId }) })
  const a = MOCK.activities.find(x => x.activityId === activityId)
  if (a.joinedByMe) { a.joinedByMe = false; a.joined-- }
  else if (a.joined < a.capacity) { a.joinedByMe = true; a.joined++ }
  else return { full: true, ...a }
  return a
}

export function createActivity(title) {
  const a = { campusId, activityId: 'a' + Date.now(), icon: '🎉', title,
    place: '中原夜市', when: '今晚 tonight',
    hostName: user.name || 'You', userId: user.userId,
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
