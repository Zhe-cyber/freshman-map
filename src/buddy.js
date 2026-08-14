// OWNER: B — BuddyUp screen only.
import { getActivities, joinActivity, createActivity } from './api.js'
import { toast } from './ui.js'

export async function initBuddy() {
  document.getElementById('newact').onclick = async () => {
    const title = prompt('活動名稱 Activity name?', '🍜 一起吃拉麵')
    if (!title) return
    await createActivity(title)
    render()
    toast('活動開好了！等人加入 🎉')
  }
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
    const label = a.joinedByMe ? '✓ 已加入' : full ? '額滿 Full' : '加入 Join'
    return `<div class="card">
      <div class="arow">
        <div class="aic">${a.icon}</div>
        <div style="flex:1">
          <div class="fname">${a.title}</div>
          <div class="fsub">${a.when} · ${a.place}</div>
          <div class="fsub">by ${a.hostName}</div>
        </div>
        <button class="abtn ${cls}" data-join="${a.activityId}"${full && !a.joinedByMe ? ' disabled' : ''}>${label}</button>
      </div>
      <div class="seats">${seats}<span class="count">${a.joined} / ${a.capacity}</span></div>
    </div>`
  }).join('')

  el.querySelectorAll('[data-join]').forEach(n => n.onclick = async () => {
    const r = await joinActivity(n.dataset.join)
    render()
    toast(r.full ? '額滿了 · this one is full 😢'
      : r.joinedByMe ? (r.joined >= r.capacity ? '加入成功！額滿囉 🎉 +20 XP' : '加入成功！+20 XP 🎉')
      : '取消了 · left the activity')
  })
}
