// Contract layer. Nobody else calls fetch().
// Empty API_BASE = mock mode. CLOUD sets it on Day 2, FRONT changes nothing.
import { MOCK } from './data.js'

const API_BASE = 'https://c6diol6blf.execute-api.us-east-1.amazonaws.com'
const YOUBIKE_URL = 'https://apis.youbike.com.tw/json/station-yb2.json'

// Multi-tenant backdoor: ?campus=ntu switches campus.
export const campusId =
  new URLSearchParams(location.search).get('campus') || 'cycu'

export const usingMock = !API_BASE

export const CAMPUSES = {
  cycu: {
    name: '中原大學',
    en: 'Chung Yuan Christian University',
    center: [121.2422, 24.9572],
    zoom: 15.4
  },
  ntu: {
    name: '國立臺灣大學',
    en: 'National Taiwan University',
    center: [121.5395, 25.0174],
    zoom: 15.4
  }
}

export const campus = CAMPUSES[campusId] || CAMPUSES.cycu

// Where the survey photos live.
const PHOTO_BASE = 'https://freshmanmap-photos-893670131810.s3.us-east-1.amazonaws.com/'

export const photoUrl = file => {
  if (!file) return null
  if (/^(https?:)?\/\//.test(file) || file.startsWith('/') || file.startsWith('./')) return file
  return PHOTO_BASE + encodeURIComponent(file)
}

// Identity
import { currentUser, idToken, isAdmin } from './auth.js'

const ID_KEY = 'freshmanmap.user'

const deviceUser = (() => {
  try {
    const saved = JSON.parse(localStorage.getItem(ID_KEY))
    if (saved?.userId) return saved
  } catch {}

  const fresh = {
    userId: 'u-' + crypto.randomUUID().slice(0, 8),
    name: ''
  }

  localStorage.setItem(ID_KEY, JSON.stringify(fresh))
  return fresh
})()

// A signed-in Cognito user wins; otherwise use device identity.
// An identity without a userId is worse than no identity at all — every write
// carries this id, so a blank one silently corrupts whatever it touches.
const signedIn = currentUser()
export const user = signedIn?.userId ? signedIn : deviceUser

export function setUserName(name) {
  deviceUser.name = name.trim()
  localStorage.setItem(ID_KEY, JSON.stringify(deviceUser))
  return deviceUser
}

// Current location
export const me = {
  lat: 24.9563,
  lng: 121.2418
}

// -----------------------------------------------------------------------------
// API helper
// -----------------------------------------------------------------------------

async function call(path, options = {}) {
  // Send the token when we have one. Public routes ignore it; the admin routes
  // carry a JWT authorizer at API Gateway and reject anything unsigned.
  const token = idToken()
  const r = await fetch(`${API_BASE}/c/${campusId}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    },
    ...options
  })

  if (!r.ok) {
    let message = `${r.status} ${path}`

    try {
      const body = await r.json()
      if (body?.error) message = body.error
    } catch {}

    throw new Error(message)
  }

  // DELETE may return an empty response.
  if (r.status === 204) return {}

  const text = await r.text()
  return text ? JSON.parse(text) : {}
}

// -----------------------------------------------------------------------------
// Buildings
// -----------------------------------------------------------------------------

export const getBuildings = () =>
  usingMock
    ? MOCK.buildings
    : call('/buildings')

// -----------------------------------------------------------------------------
// Places
// -----------------------------------------------------------------------------

const ADDED_KEY = 'freshmanmap.added.' + campusId

const added = () => {
  try {
    return JSON.parse(localStorage.getItem(ADDED_KEY)) || []
  } catch {
    return []
  }
}

// Curated map spots ship with the frontend as a fallback. This keeps newly
// surveyed spots visible immediately, even before every cloud database has
// been reseeded. Curated fields win when a cloud record has the same id so a
// stale cloud photo filename cannot override a bundled asset.
const CURATED_TYPES = new Set(['cat', 'entertainment'])
const CURATED_PLACE_IDS = new Set(['f13', 'f14', 'f15', 'f16'])
const curatedPlaces = MOCK.places.filter(place =>
  CURATED_TYPES.has(place.type) || CURATED_PLACE_IDS.has(place.placeId))

export const getPlaces = async () => {
  if (usingMock) return [...MOCK.places, ...added()]

  const cloudPlaces = await call('/places')
  const curatedById = new Map(curatedPlaces.map(place => [place.placeId, place]))
  const cloudIds = new Set(cloudPlaces.map(place => place.placeId))
  return [
    ...cloudPlaces.map(place => curatedById.has(place.placeId)
      ? { ...place, ...curatedById.get(place.placeId) }
      : place),
    ...curatedPlaces.filter(place => !cloudIds.has(place.placeId))
  ]
}

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
    lat: draft.lat,
    lng: draft.lng,
    price: draft.price || 1,
    diet: draft.diet?.length ? draft.diet : ['ask'],
    cash: draft.cash !== false,
    yes: 1,
    no: 0,
    addedByUser: true
  }

  if (!usingMock) {
    // Admins post to the authorized route, which is the only one that can
    // prove the group and therefore the only one allowed to mark a place
    // verified. Everyone else's goes to the public route and waits for review.
    return call(isAdmin() ? '/admin/places' : '/places', {
      method: 'POST',
      body: JSON.stringify(place)
    })
  }

  const all = [...added(), place]
  localStorage.setItem(ADDED_KEY, JSON.stringify(all))
  return place
}

// -----------------------------------------------------------------------------
// Activities
// -----------------------------------------------------------------------------

export const getActivities = async () => {
  if (usingMock) {
    return MOCK.activities
  }

  const list = await call('/activities')

  return list.map(a => ({
    ...a,

    // Calculate whether the current device/user joined.
    joinedByMe: (a.joinedBy || []).includes(user.userId)
  }))
}

// Join / leave an activity.
// The backend toggles membership.
export async function joinActivity(activityId) {
  // Cloud mode
  if (!usingMock) {
    return call(`/activities/${activityId}/join`, {
      method: 'POST',
      body: JSON.stringify({
        userId: user.userId
      })
    })
  }

  // Mock mode
  const a = MOCK.activities.find(
    x => x.activityId === activityId
  )

  if (!a) {
    return {
      error: 'no such activity'
    }
  }

  if (a.joinedByMe) {
    a.joinedByMe = false
    a.joined--
  } else if (a.joined < a.capacity) {
    a.joinedByMe = true
    a.joined++
  } else {
    return {
      full: true,
      ...a
    }
  }

  return a
}

// Create activity.
//
// Takes the whole draft from the create form. startAt is an ISO timestamp, not
// a display string: the countdown, sorting and auto-expiry are arithmetic, and
// "今晚 tonight" cannot be subtracted from anything.
export async function createActivity(draft) {
  const a = {
    campusId,
    activityId: 'a' + Date.now(),
    icon: draft.icon || '🎉',
    title: draft.title,
    category: draft.category || 'other',
    place: draft.place || '',
    startAt: draft.startAt || new Date(Date.now() + 2 * 3600e3).toISOString(),
    description: draft.description || '',
    hostName: draft.hostName || user.name || 'You',
    userId: draft.userId || user.userId,
    capacity: draft.capacity || 4,
    joined: 1,
    joinedBy: [user.userId],
    joinedByMe: true
  }

  if (!usingMock) {
    return call('/activities', {
      method: 'POST',
      body: JSON.stringify(a)
    })
  }

  MOCK.activities.unshift(a)
  return a
}

// -----------------------------------------------------------------------------
// Delete activity
// Only the creator should be allowed to delete it.
// The backend is responsible for checking userId.
// -----------------------------------------------------------------------------

// --- activity chat ---------------------------------------------------------
// Mock mode keeps messages in memory so the screen is usable offline; the real
// mode is a plain GET/POST. Membership is enforced by the server, not here.
const mockMessages = {}

export async function getMessages(activityId) {
  if (usingMock) return mockMessages[activityId] || []
  // The server checks membership on reads too, so it needs to know who asks.
  return call(`/activities/${activityId}/messages?userId=${encodeURIComponent(user.userId)}`)
}

// --- public profile cards --------------------------------------------------
// The full profile stays on the device. This publishes only the subset other
// people see when deciding whether to join something.
const mockCards = {}

export async function publishProfile(card) {
  if (usingMock) {
    mockCards[user.userId] = { ...card, userId: user.userId }
    return mockCards[user.userId]
  }
  return call(`/users/${encodeURIComponent(user.userId)}`, {
    method: 'PUT', body: JSON.stringify(card)
  })
}

// --- admin ------------------------------------------------------------------
// The server decides who is an admin from the verified token; these just fail
// with 401/403 for everyone else.
export const iAmAdmin = isAdmin

export async function getPendingPlaces() {
  if (usingMock) return []
  return call('/admin/places')
}

export async function verifyPlace(placeId) {
  return call(`/admin/places/${encodeURIComponent(placeId)}/verify`, { method: 'POST', body: '{}' })
}

export async function rejectPlace(placeId) {
  return call(`/admin/places/${encodeURIComponent(placeId)}`, { method: 'DELETE' })
}

export async function getProfiles(userIds = []) {
  const ids = [...new Set(userIds)].filter(Boolean).slice(0, 25)
  if (!ids.length) return []
  if (usingMock) return ids.map(id => mockCards[id]).filter(Boolean)
  return call(`/users?ids=${ids.map(encodeURIComponent).join(',')}`)
}

export async function sendMessage(activityId, text) {
  const message = {
    activityId,
    messageId: Date.now() + '',
    userId: user.userId,
    name: user.name || user.username || 'You',
    text,
    sentAt: new Date().toISOString()
  }
  if (usingMock) {
    ;(mockMessages[activityId] ||= []).push(message)
    return message
  }
  return call(`/activities/${activityId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ userId: user.userId, name: message.name, text })
  })
}

export async function deleteActivity(activityId) {
  if (!activityId) {
    throw new Error('activityId required')
  }

  // Cloud mode
  if (!usingMock) {
    return call(`/activities/${activityId}`, {
      method: 'DELETE',
      body: JSON.stringify({
        userId: user.userId
      })
    })
  }

  // Mock mode
  const index = MOCK.activities.findIndex(
    x => x.activityId === activityId
  )

  if (index === -1) {
    return {
      error: 'no such activity'
    }
  }

  const activity = MOCK.activities[index]

  // Only creator can delete.
  if (
    activity.userId &&
    activity.userId !== user.userId
  ) {
    return {
      error: 'not owner'
    }
  }

  MOCK.activities.splice(index, 1)

  return {
    ok: true,
    activityId
  }
}

// -----------------------------------------------------------------------------
// YouBike
// -----------------------------------------------------------------------------

let youBikeCache = null
let youBikeFetchedAt = 0

export async function getYouBikeStations({
  force = false
} = {}) {
  if (
    !force &&
    youBikeCache &&
    Date.now() - youBikeFetchedAt < 55_000
  ) {
    return youBikeCache
  }

  const controller = new AbortController()

  const timeout = setTimeout(
    () => controller.abort(),
    15_000
  )

  try {
    const r = await fetch(YOUBIKE_URL, {
      cache: 'no-cache',
      signal: controller.signal
    })

    if (!r.ok) {
      throw new Error(`YouBike ${r.status}`)
    }

    const data = await r.json()

    if (!Array.isArray(data)) {
      throw new Error('Unexpected YouBike response')
    }

    youBikeCache = data
      .map(s => ({
        placeId: `yb-${s.station_no}`,
        type: 'bike',
        name: s.name_tw,
        en: `${s.name_en || 'YouBike'} · ${s.station_no}`,
        address: s.address_tw,
        stationNo: s.station_no,
        lat: Number(s.lat),
        lng: Number(s.lng),
        bikes: Number(s.available_spaces) || 0,
        electricBikes:
          Number(s.available_spaces_detail?.eyb) || 0,
        returns: Number(s.empty_spaces) || 0,
        docks: Number(s.parking_spaces) || 0,
        operating: Number(s.status) === 1,
        updatedAt: s.updated_at,
        live: true
      }))
      .filter(
        s =>
          Number.isFinite(s.lat) &&
          Number.isFinite(s.lng)
      )

    youBikeFetchedAt = Date.now()

    return youBikeCache
  } finally {
    clearTimeout(timeout)
  }
}

// -----------------------------------------------------------------------------
// Items
// -----------------------------------------------------------------------------

let itemCache = null

export async function loadItems() {
  itemCache = usingMock
    ? MOCK.items
    : await call('/items')

  return itemCache
}

export function itemsIn(buildingId) {
  if (!itemCache) {
    throw new Error('call loadItems() first')
  }

  return itemCache.filter(
    i => i.buildingId === buildingId
  )
}

export const findItem = itemId =>
  itemCache?.find(i => i.itemId === itemId)

// -----------------------------------------------------------------------------
// Item reports
// -----------------------------------------------------------------------------

export function reportItem(itemId, value) {
  if (!usingMock) {
    return call('/reports', {
      method: 'POST',
      body: JSON.stringify({
        itemId,
        value
      })
    })
  }

  const item = MOCK.items.find(
    i => i.itemId === itemId
  )

  if (!item) {
    throw new Error('item not found')
  }

  const r = item.reliability

  value ? r.yes++ : r.no++

  r.score =
    r.yes / (r.yes + r.no)

  r.lastReportAt =
    new Date().toISOString()

  return {
    ...r,
    xpGained: 10
  }
}

// -----------------------------------------------------------------------------
// Shared helpers
// -----------------------------------------------------------------------------

export function metres(a, b) {
  const R = 6371000
  const rad = Math.PI / 180

  const dLat =
    (b.lat - a.lat) * rad

  const dLng =
    (b.lng - a.lng) * rad

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) *
      Math.cos(b.lat * rad) *
      Math.sin(dLng / 2) ** 2

  return Math.round(
    2 *
      R *
      Math.asin(Math.sqrt(h))
  )
}

export const floorOrder = f =>
  f[0] === 'B'
    ? -parseInt(f.slice(1), 10)
    : parseInt(f, 10)

export const score = r =>
  Math.round(
    r.yes /
      (r.yes + r.no) *
      100
  )

export const tone = p =>
  p >= 60
    ? '#34c98b'
    : p >= 35
      ? '#f2c53d'
      : '#ff6b6b'

export const toneText = p =>
  p >= 60
    ? '#1f9d6b'
    : p >= 35
      ? '#a8730a'
      : '#e04848'

export const navTo = (lat, lng) =>
  window.open(
    `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`,
    '_blank'
  )

// -----------------------------------------------------------------------------
// Real GPS
// -----------------------------------------------------------------------------

export function watchMe(onMove) {
  if (!navigator.geolocation) return

  navigator.geolocation.watchPosition(
    p => {
      me.lat = p.coords.latitude
      me.lng = p.coords.longitude
      onMove?.(me)
    },
    () => {},
    {
      enableHighAccuracy: true,
      maximumAge: 10000
    }
  )
}
