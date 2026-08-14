// OWNER: B — BuddyUp screen only.
import { getActivities, joinActivity, createActivity } from './api.js'
import { toast } from './ui.js'
import { localText, onLanguageChange, t } from './i18n.js'

export async function initBuddy() {
  document.getElementById('newact').onclick = async () => {
    const title = prompt(t('activityPrompt'), t('activityExample'))
    if (!title) return
    await createActivity(title)
    render()
    toast(t('activityCreated'))
  }
  onLanguageChange(render)
  render()
}

async function render() {
  const list = await getActivities()
  const el = document.getElementById('blist')

  el.innerHTML = list.map(a => {
    const full = a.joined >= a.capacity
    const seats = Array.from({ length: a.capacity },
      (_, i) => `<div class="seat${i < a.joined ? ' on' : ''}">${i < a.joined ? '🙂' : ''}</div>`).join('')
    const cls = a.joinedByMe ? 'done' : full ? 'full' : ''
    const label = a.joinedByMe ? t('joined') : full ? t('full') : t('join')
    return `<div class="card">
      <div class="arow">
        <div class="aic">${a.icon}</div>
        <div style="flex:1">
          <div class="fname">${localText(a.title)}</div>
          <div class="fsub">${localText(a.when)} · ${localText(a.place)}</div>
          <div class="fsub">${t('by', { name: a.hostName })}</div>
        </div>
        <button class="abtn ${cls}" data-join="${a.activityId}"${full && !a.joinedByMe ? ' disabled' : ''}>${label}</button>
      </div>
      <div class="seats">${seats}<span class="count">${a.joined} / ${a.capacity}</span></div>
    </div>`
  }).join('')

  el.querySelectorAll('[data-join]').forEach(n => n.onclick = async () => {
    const r = await joinActivity(n.dataset.join)
    render()
    toast(r.full ? t('activityFull')
      : r.joinedByMe ? (r.joined >= r.capacity ? t('joinSuccessFull') : t('joinSuccess'))
      : t('activityLeft'))
  })
}
