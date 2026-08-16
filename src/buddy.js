// OWNER: B — BuddyUp screen only.
//
// What a real meetup app does that a title and a counter do not:
//   - structured fields, so an activity is understandable before you join
//   - a real timestamp, which is what makes everything below possible
//   - a live countdown and a lifecycle: upcoming -> soon -> now -> ended
//   - who is coming, not just how many
//   - ended activities move out of the way instead of cluttering the list
//   - a reminder for something you joined that starts shortly
//
// Deliberately NOT here: Web Push. Real push needs a service worker, VAPID
// keys and a push service, and on iOS only works for an installed PWA — it
// cannot reach a locked phone without all of that. The in-app banner is the
// honest version for a demo; say that out loud rather than implying the app
// pushes notifications.

import {
  getActivities,
  joinActivity,
  createActivity,
  deleteActivity,
  user
} from './api.js'

import { toast } from './ui.js'
import { localText, onLanguageChange, t } from './i18n.js'

const CATEGORIES = [
  ['food', '🍜'], ['hotpot', '🍲'], ['sport', '🏸'],
  ['outdoor', '🚲'], ['night', '🎤'], ['study', '📚'], ['other', '🎉']
]

let activities = []
let tick = null

const html = v => String(v ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

// ---------------------------------------------------------------------------
// Time
// ---------------------------------------------------------------------------

const minutesUntil = a => Math.round((new Date(a.startAt) - Date.now()) / 60000)

// upcoming -> soon (within the hour) -> now (started, still running) -> ended
function phase(a) {
  if (!a.startAt) return 'upcoming'
  const m = minutesUntil(a)
  if (m < -120) return 'ended'
  if (m <= 0) return 'now'
  if (m <= 60) return 'soon'
  return 'upcoming'
}

function countdown(a) {
  if (!a.startAt) return ''
  const m = minutesUntil(a)
  if (m < -120) return t('actEnded')
  if (m <= 0) return t('actHappeningNow')
  if (m < 60) return t('actInMinutes', { count: m })
  if (m < 60 * 24) return t('actInHours', { h: Math.floor(m / 60), m: m % 60 })
  const days = Math.round(m / 60 / 24)
  return t(days === 1 ? 'actInDay' : 'actInDays', { count: days })
}

const clockTime = a => a.startAt
  ? new Date(a.startAt).toLocaleString([], { weekday: 'short', hour: '2-digit', minute: '2-digit' })
  : ''

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export async function initBuddy() {
  const newButton = document.getElementById('newact')
  if (newButton) newButton.onclick = openCreate

  onLanguageChange(render)
  await load()

  // One timer for the whole list: countdowns move, nothing re-fetches.
  clearInterval(tick)
  tick = setInterval(render, 30000)
}

async function load() {
  try {
    activities = await getActivities()
  } catch {
    toast(t('errGeneric'))
    activities = []
  }
  render()
}

function render() {
  const list = document.getElementById('blist')
  if (!list) return

  const live = activities
    .filter(a => phase(a) !== 'ended')
    .sort((a, b) => new Date(a.startAt || 0) - new Date(b.startAt || 0))
  const past = activities.filter(a => phase(a) === 'ended')

  reminder(live)

  list.innerHTML =
    (live.length ? live.map(card).join('') : empty()) +
    (past.length
      ? `<div class="pasthead">${t('actPast', { count: past.length })}</div>` +
        past.map(card).join('')
      : '')

  list.querySelectorAll('[data-join]').forEach(b => b.onclick = () => join(b.dataset.join))
  list.querySelectorAll('[data-del]').forEach(b => b.onclick = () => remove(b.dataset.del))
}

// Only appears while the app is open — that is the honest limit of it.
function reminder(live) {
  const box = document.getElementById('breminder')
  if (!box) return
  const soon = live.find(a => a.joinedByMe && ['soon', 'now'].includes(phase(a)))
  box.hidden = !soon
  if (soon) {
    box.innerHTML =
      `⏰ <b>${html(localText(soon.title))}</b> · ${html(countdown(soon))} · ${html(soon.place || '')}`
  }
}

const empty = () => `<div class="bempty">
    <div class="bemoji">🫖</div>
    <div class="btitle">${t('actNoneTitle')}</div>
    <div class="bsub">${t('actNoneSub')}</div>
  </div>`

function card(a) {
  const p = phase(a)
  const joined = a.joined || 0
  const capacity = a.capacity || 4
  const full = joined >= capacity && !a.joinedByMe
  const mine = a.hostName && a.hostName === (user.name || user.username)

  const seats = Array.from({ length: Math.min(capacity, 12) }, (_, i) =>
    `<div class="seat${i < joined ? ' on' : ''}">${i < joined ? '🙂' : ''}</div>`).join('')

  const who = (a.joinedBy || []).length
    ? `<div class="who">${t('actWhoComing')}: ${a.joinedBy.slice(0, 6)
        .map(id => html(shortName(id))).join(', ')}${a.joinedBy.length > 6 ? ' …' : ''}</div>`
    : ''

  const label = a.joinedByMe ? `✓ ${t('joined')}` : full ? t('full') : t('join')
  const cls = a.joinedByMe ? 'done' : full ? 'full' : ''

  return `<div class="card act ${p}">
    <div class="arow">
      <div class="aic">${html(a.icon || '🎉')}</div>
      <div style="flex:1">
        <div class="fname">${html(localText(a.title))}</div>
        <div class="fsub">🕒 ${html(clockTime(a))} · 📍 ${html(a.place || '')}</div>
        <div class="fsub">${t('by')} ${html(a.hostName || '—')}</div>
      </div>
      <div class="acol">
        <span class="cdown ${p}">${html(countdown(a))}</span>
        <button class="abtn ${cls}" data-join="${html(a.activityId)}" ${full ? 'disabled' : ''}>${label}</button>
      </div>
    </div>
    ${a.description ? `<div class="adesc">${html(localText(a.description))}</div>` : ''}
    <div class="seats">${seats}<span class="scount">${joined} / ${capacity}</span></div>
    ${who}
    ${mine ? `<button class="linkbtn quiet" data-del="${html(a.activityId)}">${t('actCancel')}</button>` : ''}
  </div>`
}

// joinedBy holds user ids; printing raw UUIDs at people is not useful.
function shortName(id) {
  if (id === user.userId) return t('actYou')
  if (String(id).startsWith('seed-')) return t('actStudent')
  if (id === 'host') return t('actHost')
  return String(id).slice(0, 6)
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

async function join(activityId) {
  const a = activities.find(x => x.activityId === activityId)
  if (!a) return
  try {
    const r = await joinActivity(activityId)
    if (r?.error === 'full') return toast(t('activityFull'))
    a.joined = r.joined ?? a.joined
    a.joinedByMe = r.joinedByMe ?? !a.joinedByMe
    if (r.joinedBy) a.joinedBy = r.joinedBy
    render()
    toast(a.joinedByMe ? t('joinSuccess') : t('activityLeft'))
  } catch {
    toast(t('errGeneric'))
  }
}

async function remove(activityId) {
  if (!confirm(t('actCancelConfirm'))) return
  try {
    await deleteActivity(activityId)
    activities = activities.filter(a => a.activityId !== activityId)
    render()
    toast(t('actCancelled'))
  } catch {
    toast(t('errGeneric'))
  }
}

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

function openCreate() {
  const box = document.getElementById('bcreate')
  if (!box) return
  box.hidden = false

  // Default to two hours from now, in the user's own timezone.
  const soon = new Date(Date.now() + 2 * 3600e3)
  const local = new Date(soon.getTime() - soon.getTimezoneOffset() * 60000)
    .toISOString().slice(0, 16)

  box.innerHTML = `
    <div class="ctitle">${t('actNew')}</div>

    <div class="field"><label for="ac-title">${t('actTitle')} *</label>
      <input id="ac-title" type="text" maxlength="50" autocomplete="off"></div>

    <div class="field"><label>${t('actCategory')}</label>
      <div class="picker" id="ac-cat">${CATEGORIES.map(([k, icon], i) =>
        `<button type="button" class="pick" data-cat="${k}" data-icon="${icon}" data-on="${i === 0 ? 1 : 0}">${icon}</button>`).join('')}</div></div>

    <div class="field"><label for="ac-place">${t('actPlace')} *</label>
      <input id="ac-place" type="text" maxlength="60" autocomplete="off"></div>

    <div class="field"><label for="ac-when">${t('actWhen')} *</label>
      <input id="ac-when" type="datetime-local" value="${local}"></div>

    <div class="field"><label>${t('actCapacity')}</label>
      <div class="picker" id="ac-cap">${[2, 3, 4, 6, 8, 12].map(n =>
        `<button type="button" class="pick wide" data-cap="${n}" data-on="${n === 4 ? 1 : 0}">${n}</button>`).join('')}</div></div>

    <div class="field"><label for="ac-desc">${t('actDescription')}</label>
      <input id="ac-desc" type="text" maxlength="120" autocomplete="off"
             placeholder="${t('actDescriptionHint')}"></div>

    <div class="actions">
      <button class="btn ghost" id="ac-cancel">${t('cancel')}</button>
      <button class="btn go" id="ac-save">${t('actCreate')}</button>
    </div>`

  const pickOne = (sel, attr) => box.querySelector(sel).onclick = e => {
    const b = e.target.closest(`[data-${attr}]`)
    if (!b) return
    box.querySelectorAll(`${sel} .pick`).forEach(x => x.dataset.on = '0')
    b.dataset.on = '1'
  }
  pickOne('#ac-cat', 'cat')
  pickOne('#ac-cap', 'cap')

  box.querySelector('#ac-cancel').onclick = closeCreate
  box.querySelector('#ac-save').onclick = save
  box.querySelector('#ac-title').focus()
}

function closeCreate() {
  const box = document.getElementById('bcreate')
  box.hidden = true
  box.innerHTML = ''
}

async function save() {
  const box = document.getElementById('bcreate')
  const title = box.querySelector('#ac-title').value.trim()
  const place = box.querySelector('#ac-place').value.trim()
  const when = box.querySelector('#ac-when').value

  if (!title || !place || !when) return toast(t('actNeedFields'))

  const startAt = new Date(when)
  if (startAt.getTime() < Date.now() - 60000) return toast(t('actNeedFuture'))

  const cat = box.querySelector('#ac-cat [data-on="1"]')

  try {
    const created = await createActivity({
      title,
      place,
      startAt: startAt.toISOString(),
      category: cat.dataset.cat,
      icon: cat.dataset.icon,
      capacity: Number(box.querySelector('#ac-cap [data-on="1"]').dataset.cap),
      description: box.querySelector('#ac-desc').value.trim(),
      hostName: user.name || user.username || 'You',
      userId: user.userId
    })
    activities.push({ ...created, joinedByMe: true })
    closeCreate()
    render()
    toast(t('activityCreated'))
  } catch {
    toast(t('errGeneric'))
  }
}
