// OWNER: B — 美食 screen only.
import { DIET } from './data.js'
import { getPlaces, me, metres, score, tone, toneText, navTo } from './api.js'
import { toast } from './ui.js'

// ponytail: only filters the survey data can actually answer. Add 全素/無豬肉
// back once E's walking survey tags vegan and pork — right now every place is
// veg or ask, so those two filters would return everything or nothing.
const FILTERS = [
  ['veg',   '素食 Veg', f => f.diet.includes('veg')],
  ['cheap', 'NT$ ~100', f => f.price === 1],
  ['near',  '5 min',    f => metres(me, f) < 400]
]
const on = new Set()

export async function initFood() {
  const chips = document.getElementById('fchips')
  FILTERS.forEach(([key, label]) => {
    const b = document.createElement('button')
    b.className = 'chip'; b.dataset.on = '0'; b.textContent = label
    b.onclick = () => {
      on.has(key) ? (on.delete(key), b.dataset.on = '0') : (on.add(key), b.dataset.on = '1')
      render()
    }
    chips.appendChild(b)
  })
  render()
}

async function render() {
  const all = (await getPlaces()).filter(p => p.type === 'food')
  const list = all
    .filter(f => FILTERS.every(([key, , test]) => !on.has(key) || test(f)))
    .sort((a, b) => score(b) - score(a))

  const el = document.getElementById('flist')
  if (!list.length) {
    el.innerHTML = '<div class="card empty">沒有符合的店 · nothing matches</div>'
    return
  }

  el.innerHTML = list.map(f => {
    const p = score(f)
    const tags = f.diet.map(d => `<span class="tag ${DIET[d][1]}">${DIET[d][0]}</span>`).join('') +
      (f.cash ? '<span class="tag t-cash">現金 cash</span>' : '') +
      (f.price === 1 ? '<span class="tag t-cheap">NT$ ~100</span>' : '')
    return `<div class="card">
      <div class="frow">
        <div class="fic">${f.icon}</div>
        <div style="flex:1">
          <div class="fname">${f.name}</div>
          <div class="fsub">${f.en}</div>
          <div class="tags">${tags}</div>
        </div>
      </div>
      <div class="fmeta">🚶 ${metres(me, f)} m
        <span class="eng" style="background:${tone(p)}22;color:${toneText(p)}">英文 ${Math.round(p / 10)}/10</span>
      </div>
      <div class="say" data-say="${f.placeId}">💬 <div>${f.say}<small>${f.sayEn}</small></div></div>
      <div class="actions"><button class="btn go" data-go="${f.lat},${f.lng}">🧭 Go</button></div>
    </div>`
  }).join('')

  el.querySelectorAll('[data-say]').forEach(n => n.onclick = () =>
    toast('「' + list.find(f => f.placeId === n.dataset.say).say + '」'))
  el.querySelectorAll('[data-go]').forEach(n => n.onclick = () =>
    navTo(...n.dataset.go.split(',')))
}
