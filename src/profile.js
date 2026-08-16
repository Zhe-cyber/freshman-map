// OWNER: profile screen.
//
// Gamification here is derived from things the user actually did — places
// recommended, activities joined, buildings visited. Nothing is awarded for
// opening the app, because a number that only goes up for existing is not a
// reward, it is decoration.
//
// The picture is stored as a data URI in localStorage, downscaled to 256px
// first. A phone photo is 3-5 MB and localStorage caps around 5 MB, so storing
// the original fills the quota with one upload. Uploading to S3 would need a
// presigned-URL endpoint; that is the upgrade, not this.

import { user, setUserName, getPlaces, getActivities, campusId, publishProfile } from './api.js'
import { toast } from './ui.js'
import { t, onLanguageChange } from './i18n.js'

const KEY = 'freshmanmap.profile.' + campusId
const AVATAR_PX = 256
const SHARE_PX = 96          // what other people see: a 20px chip and a 56px card

const FIELDS = [
  // key            required  type      max
  ['displayName',   true,  'text',   40],
  ['homeCountry',   false, 'text',   40],
  ['department',    false, 'text',   50],
  ['year',          false, 'select', null],
  ['languages',     false, 'text',   60],
  ['interests',     false, 'text',   80],
  ['bio',           false, 'text',  140]
]

const YEARS = ['exchange', 'y1', 'y2', 'y3', 'y4', 'postgrad', 'staff']

const html = v => String(v ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

export const loadProfile = () => {
  try { return JSON.parse(localStorage.getItem(KEY)) || {} } catch { return {} }
}

const saveProfile = p => localStorage.setItem(KEY, JSON.stringify(p))

// ---------------------------------------------------------------------------
// Progress — earned, not given
// ---------------------------------------------------------------------------

const LEVELS = [
  [0,   'levelLost'],       // just arrived
  [3,   'levelSettling'],
  [8,   'levelSurviving'],
  [15,  'levelLocal'],
  [25,  'levelGuide']       // you can now help the next batch
]

export async function stats() {
  const profile = loadProfile()
  let places = [], activities = []
  try { [places, activities] = await Promise.all([getPlaces(), getActivities()]) } catch {}

  const mine = places.filter(p => p.addedByUser).length
  const joined = activities.filter(a => a.joinedByMe).length
  const hosted = activities.filter(a => a.hostName && a.hostName === (user.name || user.username)).length
  const visited = (profile.visited || []).length
  const filled = FIELDS.filter(([k]) => profile[k]).length

  const points = mine * 3 + joined * 2 + hosted * 5 + visited + filled
  let level = LEVELS[0]
  for (const l of LEVELS) if (points >= l[0]) level = l
  const next = LEVELS[LEVELS.indexOf(level) + 1]

  return {
    points, mine, joined, hosted, visited, filled,
    levelKey: level[1],
    levelIndex: LEVELS.indexOf(level) + 1,
    toNext: next ? next[0] - points : 0,
    progress: next ? (points - level[0]) / (next[0] - level[0]) : 1
  }
}

// Called by the map when a building directory is opened.
export function markVisited(buildingId) {
  const p = loadProfile()
  const seen = new Set(p.visited || [])
  if (seen.has(buildingId)) return
  seen.add(buildingId)
  p.visited = [...seen]
  saveProfile(p)
}

const BADGES = [
  ['badgeFirstJoin',  s => s.joined >= 1],
  ['badgeHost',       s => s.hosted >= 1],
  ['badgeScout',      s => s.mine >= 1],
  ['badgeExplorer',   s => s.visited >= 3],
  ['badgeComplete',   s => s.filled >= FIELDS.length],
  ['badgeRegular',    s => s.joined >= 5]
]

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export async function initProfile() {
  onLanguageChange(render)
  await render()
}

export async function render() {
  const root = document.getElementById('s-me')
  if (!root) return
  const p = loadProfile()
  const s = await stats()
  const pct = Math.round(s.progress * 100)

  root.querySelector('.scroll').innerHTML = `
    <div class="h1">${t('navMe')}<small>${t('profileSub')}</small></div>

    <div class="card pcard">
      <div class="prow">
        <button class="avatar-btn" id="pf-avatar-btn" title="${t('profilePhoto')}">
          ${p.avatar
            ? `<img class="avatar-img" src="${p.avatar}" alt="">`
            : `<span class="avatar-fallback">${html((p.displayName || user.name || '🐣').slice(0, 1))}</span>`}
          <span class="avatar-edit">📷</span>
        </button>
        <div style="flex:1">
          <div class="pname">${html(p.displayName || user.name || t('profileNoName'))}</div>
          <div class="plevel">${t('levelLabel', { n: s.levelIndex })} · ${t(s.levelKey)}</div>
          <div class="xpbar wide"><i style="width:${pct}%"></i></div>
          <div class="pxp">${t('profilePoints', { n: s.points })}${
            s.toNext ? ' · ' + t('profileToNext', { n: s.toNext }) : ''}</div>
        </div>
      </div>

      <div class="pstats">
        <div><b>${s.joined}</b><span>${t('statJoined')}</span></div>
        <div><b>${s.hosted}</b><span>${t('statHosted')}</span></div>
        <div><b>${s.mine}</b><span>${t('statAdded')}</span></div>
        <div><b>${s.visited}</b><span>${t('statVisited')}</span></div>
      </div>
    </div>

    <div class="card">
      <div class="ctitle">${t('profileBadges')}</div>
      <div class="badges">${BADGES.map(([key, won]) =>
        `<div class="badge2${won(s) ? ' got' : ''}">
           <span>${won(s) ? '🏅' : '🔒'}</span>${t(key)}
         </div>`).join('')}</div>
    </div>

    <div class="card">
      <div class="ctitle">${t('profileDetails')}</div>
      <div class="hint">${t('profileOptionalNote')}</div>
      <div class="hint visnote">👀 ${t('profileVisibility')}</div>
      ${FIELDS.map(([key, required, type, max]) => `
        <div class="field">
          <label for="pf-${key}">${t('pf.' + key)}${required ? ' *' : ` <span class="opt">${t('optional')}</span>`}</label>
          ${type === 'select'
            ? `<select id="pf-${key}">
                 <option value="">—</option>
                 ${YEARS.map(y => `<option value="${y}"${p[key] === y ? ' selected' : ''}>${t('year.' + y)}</option>`).join('')}
               </select>`
            : `<input id="pf-${key}" type="text" maxlength="${max}" value="${html(p[key] || '')}"
                      placeholder="${t('pfHint.' + key)}">`}
        </div>`).join('')}
      <div class="actions"><button class="btn go" id="pf-save">${t('profileSave')}</button></div>
    </div>

    <button class="linkbtn quiet" id="pf-signout">${t('loginSignOut')}</button>

    <input type="file" id="pf-file" accept="image/*" hidden>`

  root.querySelector('#pf-avatar-btn').onclick = () => root.querySelector('#pf-file').click()
  root.querySelector('#pf-file').onchange = e => pickAvatar(e.target.files[0])
  root.querySelector('#pf-save').onclick = save
}

// The shareable subset, so people can see who is organising or joining an
// activity before they commit. The whitelist lives in the Lambda as well —
// this side decides what to send, that side decides what to store.
//
// The 96px copy goes up, not the 256px one. It is shown at 20px in a chip and
// 56px in a card, and eight of them load on one screen.
const publish = p => publishProfile({
  displayName: p.displayName, avatar: p.avatarSmall || p.avatar,
  homeCountry: p.homeCountry, department: p.department, year: p.year,
  languages: p.languages, interests: p.interests, bio: p.bio
})

async function save() {
  const p = loadProfile()
  for (const [key] of FIELDS) {
    const el = document.getElementById('pf-' + key)
    if (el) p[key] = el.value.trim()
  }
  if (!p.displayName) return toast(t('profileNeedName'))
  saveProfile(p)
  setUserName(p.displayName)          // chat and hosting use this name

  // Swallowing this was the bug behind "I saved my profile but nobody can see
  // it" — the local save succeeded, the upload did not, and nothing said so.
  let shared = true
  try {
    await publish(p)
  } catch (e) {
    shared = false
    console.error('profile publish failed', e)
  }

  await render()
  toast(shared ? t('profileSaved') : t('profileShareFail'))
}

// A 4000x3000 phone photo is several MB; localStorage holds about 5 MB total.
// Downscale to a square thumbnail before storing, or one upload fills the quota.
// Centre-crop to a square of px, so a portrait photo is not squashed.
function square(img, side, px) {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = px
  canvas.getContext('2d').drawImage(
    img,
    (img.width - side) / 2, (img.height - side) / 2, side, side,
    0, 0, px, px
  )
  return canvas
}

function pickAvatar(file) {
  if (!file) return
  if (!file.type.startsWith('image/')) return toast(t('profileNeedImage'))

  const reader = new FileReader()
  reader.onload = () => {
    const img = new Image()
    img.onload = () => {
      const side = Math.min(img.width, img.height)
      const canvas = square(img, side, AVATAR_PX)
      const p = loadProfile()
      p.avatar = canvas.toDataURL('image/jpeg', 0.8)
      p.avatarSmall = square(img, side, SHARE_PX).toDataURL('image/jpeg', 0.7)
      try {
        saveProfile(p)
      } catch {
        return toast(t('profilePhotoTooBig'))
      }
      // Publish straight away. Waiting for Save meant a photo picked on its own
      // never reached anyone — the picture looked set but nobody could see it.
      render()
      if (p.displayName) {
        publish(p).then(
          () => toast(t('profilePhotoSaved')),
          e => { console.error('avatar publish failed', e); toast(t('profileShareFail')) })
      } else {
        toast(t('profilePhotoSaved'))
      }
    }
    img.onerror = () => toast(t('profileNeedImage'))
    img.src = reader.result
  }
  reader.readAsDataURL(file)
}
