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
  getMessages,
  sendMessage,
  getProfiles,
  user,
  setUserName
} from './api.js'

import { toast, openSheet } from './ui.js'
import { localText, onLanguageChange, t } from './i18n.js'

const CATEGORIES = [
  ['food', '🍜'], ['hotpot', '🍲'], ['sport', '🏸'],
  ['outdoor', '🚲'], ['night', '🎤'], ['study', '📚'], ['other', '🎉']
]

const MIN_CAP = 2
const MAX_CAP = 50

let activities = []
let tick = null
// userId -> published profile card. Fetched once per render for everyone
// visible, so opening a card is instant and does not hit the API per tap.
const cards = new Map()

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
  await loadCards()
  render()
}

// One request for every person shown on the screen, rather than one per name.
async function loadCards() {
  const ids = [...new Set(activities.flatMap(a =>
    [a.userId, ...(a.joinedBy || [])]).filter(Boolean))]
    .filter(id => !cards.has(id) && !String(id).startsWith('seed-'))
  if (!ids.length) return
  try {
    for (const c of await getProfiles(ids)) cards.set(c.userId, c)
  } catch { /* profiles are a nicety; the list still works without them */ }
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
  list.querySelectorAll('[data-chat]').forEach(b => b.onclick = () => openChat(b.dataset.chat))
  list.querySelectorAll('[data-who]').forEach(b => b.onclick = e => {
    e.stopPropagation()
    showCard(b.dataset.who)
  })
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

  // One row of real people instead of a row of identical smileys and a
  // separate row of names saying the same thing. A face is clickable when we
  // have a card for it, so you can read someone before deciding to join.
  const person = id => {
    const c = cards.get(id)
    const label = c?.displayName || shortName(id)
    const tag = c ? 'button' : 'span'
    // The organiser is inside joinedBy too, so crown them here rather than
    // printing the same person twice.
    const crown = id && id === a.userId ? '<span class="fcrown">👑</span>' : ''
    return `<${tag} class="face${c ? '' : ' flat'}"${c ? ` data-who="${html(id)}"` : ''} title="${html(label)}">
        <span class="fdisc">${crown}${
          // A picture published before the size fix is truncated base64 and
          // cannot decode. Fall back to the initial rather than a broken icon.
          c?.avatar
            ? `<img src="${c.avatar}" alt="" onerror="this.replaceWith(document.createTextNode('${
                html(label.slice(0, 1)).replace(/'/g, '')}'))">`
            : html(label.slice(0, 1))
        }</span>
        <span class="fname2">${html(label)}</span>
      </${tag}>`
  }

  const host = a.userId ? cards.get(a.userId)?.displayName || shortName(a.userId)
                        : a.hostName || '—'

  const going = (a.joinedBy || []).slice(0, 8)
  const spare = Math.max(0, Math.min(capacity, 8) - going.length)

  const who = `<div class="who">
      <div class="wholabel">${t('actWhoComing')} · ${joined}/${capacity}</div>
      <div class="faces">
        ${going.map(person).join('')}
        ${Array.from({ length: spare }, () =>
          '<span class="face empty"><span class="fdisc"></span></span>').join('')}
        ${(a.joinedBy || []).length > 8
          ? `<span class="face flat"><span class="fdisc">+${a.joinedBy.length - 8}</span></span>`
          : ''}
      </div>
    </div>`

  // t('joined') already carries the tick; prefixing another gave "✓ ✓ Joined".
  const label = a.joinedByMe ? t('joined') : full ? t('full') : t('join')
  const cls = a.joinedByMe ? 'done' : full ? 'full' : ''

  return `<div class="card act ${p}">
    <div class="arow">
      <div class="aic">${html(a.icon || '🎉')}</div>
      <div style="flex:1">
        <div class="fname">${html(localText(a.title))}</div>
        <div class="fsub">${t('by')} ${html(host)}</div>
      </div>
      <div class="acol">
        <span class="cdown ${p}">${html(countdown(a))}</span>
        <button class="abtn ${cls}" data-join="${html(a.activityId)}" ${full ? 'disabled' : ''}>${label}</button>
      </div>
    </div>
    <div class="awhen">
      <span class="wbit"><b>🕒</b>${html(clockTime(a))}</span>
      ${a.place ? `<span class="wbit"><b>📍</b>${html(a.place)}</span>` : ''}
    </div>
    ${a.description ? `<div class="adesc">${html(localText(a.description))}</div>` : ''}
    ${who}
    ${a.joinedByMe ? `<button class="linkbtn" data-chat="${html(a.activityId)}">💬 ${t('chatOpen')}</button>` : ''}
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
    await loadCards()
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

// Whether to join often comes down to who else is going. Tapping a name shows
// what that person chose to share — nothing more; the rest of their profile
// never leaves their device.
function showCard(userId) {
  const c = cards.get(userId)
  if (!c) return toast(t('cardNone'))
  const rows = [
    ['pf.homeCountry', c.homeCountry],
    ['pf.department',  c.department],
    ['pf.year',        c.year && t('year.' + c.year)],
    ['pf.languages',   c.languages],
    ['pf.interests',   c.interests]
  ].filter(([, v]) => v)

  openSheet(`
    <div class="head">
      <div class="cardpic">${c.avatar
        ? `<img src="${c.avatar}" alt="" onerror="this.remove()">`
        : html((c.displayName || '?').slice(0, 1))}</div>
      <div><div class="name">${html(c.displayName || t('profileNoName'))}</div>
        ${c.bio ? `<div class="sub">${html(c.bio)}</div>` : ''}</div>
    </div>
    ${rows.length ? `<div class="cardrows">${rows.map(([k, v]) =>
      `<div><span>${t(k)}</span><b>${html(v)}</b></div>`).join('')}</div>` : ''}
    <div class="hint" style="margin-top:12px">${t('cardPrivacy')}</div>`)
}

// ---------------------------------------------------------------------------
// Chat — one room per activity, for the people who joined it
// ---------------------------------------------------------------------------

let chatId = null
let chatPoll = null

async function openChat(activityId) {
  const a = activities.find(x => x.activityId === activityId)
  if (!a) return

  // A chat needs a name to attribute messages to. Signed-in users have one
  // from Cognito; guests are asked once and it is remembered.
  if (!user.name) {
    const name = prompt(t('chatAskName'))
    if (!name?.trim()) return
    setUserName(name.trim())
  }

  chatId = activityId
  const box = document.getElementById('bchat')
  box.hidden = false
  box.innerHTML = `
    <div class="chathead">
      <div><b>${html(localText(a.title))}</b><div class="fsub">${t('chatMembersOnly')}</div></div>
      <button class="back" id="chat-close">✕</button>
    </div>
    <div class="chatlog" id="chat-log"><div class="chatempty">${t('chatLoading')}</div></div>
    <div class="chatbar">
      <input id="chat-text" type="text" maxlength="500" placeholder="${t('chatPlaceholder')}" autocomplete="off">
      <button class="btn go" id="chat-send">${t('chatSend')}</button>
    </div>`

  document.getElementById('chat-close').onclick = closeChat
  document.getElementById('chat-send').onclick = post
  document.getElementById('chat-text').onkeydown = e => { if (e.key === 'Enter') post() }

  await refreshChat()
  clearInterval(chatPoll)
  // Polling, not WebSockets. At a few people per activity this is a request
  // every four seconds; a WebSocket API would be a day of work for the same
  // visible result. Swap it later if rooms get busy.
  chatPoll = setInterval(refreshChat, 4000)
  document.getElementById('chat-text').focus()
}

function closeChat() {
  clearInterval(chatPoll)
  chatPoll = null
  chatId = null
  const box = document.getElementById('bchat')
  box.hidden = true
  box.innerHTML = ''
}

async function refreshChat() {
  if (!chatId) return
  let messages = []
  try {
    messages = await getMessages(chatId)
  } catch { return }

  const log = document.getElementById('chat-log')
  if (!log) return
  const atBottom = log.scrollHeight - log.scrollTop - log.clientHeight < 40

  log.innerHTML = messages.length
    ? messages.map(m => `
        <div class="msg${m.userId === user.userId ? ' me' : ''}">
          <div class="mname">${html(m.name)} · ${html(shortTime(m.sentAt))}</div>
          <div class="mtext">${html(m.text)}</div>
        </div>`).join('')
    : `<div class="chatempty">${t('chatEmpty')}</div>`

  if (atBottom) log.scrollTop = log.scrollHeight
}

const shortTime = iso =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

async function post() {
  const input = document.getElementById('chat-text')
  const text = input.value.trim()
  if (!text) return
  input.value = ''
  try {
    await sendMessage(chatId, text)
    await refreshChat()
  } catch (e) {
    toast(/403/.test(String(e.message)) ? t('chatNotMember') : t('errGeneric'))
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

    <div class="field"><label for="ac-cap">${t('actCapacity')}</label>
      <input id="ac-cap" type="number" min="${MIN_CAP}" max="${MAX_CAP}" value="4" inputmode="numeric">
      <div class="hint">${t('actCapacityHint', { min: MIN_CAP, max: MAX_CAP })}</div></div>

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

  // Free entry, but bounded: one person cannot invite the whole campus, and a
  // capacity of zero would make an activity nobody can join.
  const capacity = Number(box.querySelector('#ac-cap').value)
  if (!Number.isInteger(capacity) || capacity < MIN_CAP || capacity > MAX_CAP)
    return toast(t('actCapacityHint', { min: MIN_CAP, max: MAX_CAP }))

  const cat = box.querySelector('#ac-cat [data-on="1"]')

  try {
    const created = await createActivity({
      title,
      place,
      startAt: startAt.toISOString(),
      category: cat.dataset.cat,
      icon: cat.dataset.icon,
      capacity,
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
