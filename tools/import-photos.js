#!/usr/bin/env node
// Turn survey photo filenames into map records.
//
// The survey convention IS the data format — name the photo, drop it in Drive:
//   電學三樓（男）.jpg      → 電學大樓 3F, men's toilet
//   篤信一樓飲水機.jpg      → 篤信大樓 1F, water dispenser
//   電學地下一樓（女）.jpg  → 電學大樓 B1, women's toilet
//
// Usage:
//   ls photos/ | node tools/import-photos.js          # pipe filenames in
//   node tools/import-photos.js photos/               # or point at a folder
//
// Prints JS ready to paste into src/data.js, and warns about anything it
// could not parse rather than silently dropping it.

import { readdirSync, readFileSync } from 'node:fs'

// Add a line here when the survey reaches a new building. lat/lng from OSM.
const BUILDINGS = {
  電學: { id: 'elec', name: '電學大樓', en: 'Electrical Engineering Building', lat: 24.955929, lng: 121.242519 },
  篤信: { id: 'duxin', name: '篤信大樓', en: 'Duxin Building',                  lat: 24.956206, lng: 121.242582 },
  工學: { id: 'eng',   name: '工學館',   en: 'Engineering Building',            lat: 24.957285, lng: 121.244358 },
  圖書: { id: 'lib',   name: '張靜愚紀念圖書館', en: 'Library',                 lat: 24.958309, lng: 121.240707 }
}

const DIGITS = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9, 十: 10 }

const FACILITIES = [
  { match: /飲水機/,  type: 'water',  note: '飲水機 water dispenser', suffix: 'w' },
  { match: /（男）|\(男\)/, type: 'toilet', note: '男 men',           suffix: 'tm' },
  { match: /（女）|\(女\)/, type: 'toilet', note: '女 women',         suffix: 'tf' },
  { match: /無障礙/,  type: 'toilet', note: '無障礙 accessible',      suffix: 'ta' }
]

function parseFloor(stem) {
  const basement = stem.match(/地下([一二三四五六七八九十])樓/)
  if (basement) return 'B' + DIGITS[basement[1]]
  const above = stem.match(/([一二三四五六七八九十])樓/)
  if (above) return DIGITS[above[1]] + 'F'
  const digits = stem.match(/(?:^|[^\d])(\d{1,2})\s*[F樓]/i)
  if (digits) return digits[1] + 'F'
  return null
}

function parseFilename(filename) {
  const stem = filename.replace(/\.(jpe?g|heic|png|webp)$/i, '')
  const key = Object.keys(BUILDINGS).find(k => stem.startsWith(k))
  if (!key) return { error: 'unknown building', filename }

  const floor = parseFloor(stem)
  if (!floor) return { error: 'no floor found', filename }

  const facility = FACILITIES.find(f => f.match.test(stem))
  if (!facility) return { error: 'not a toilet or water dispenser', filename }

  const b = BUILDINGS[key]
  return {
    building: b,
    itemId: `${b.id}-${floor.toLowerCase()}${facility.suffix}`,
    floor,
    type: facility.type,
    note: facility.note,
    photo: filename
  }
}

function main() {
  const arg = process.argv[2]
  const names = arg
    ? readdirSync(arg)
    : readFileSync(0, 'utf8').split('\n').map(s => s.trim()).filter(Boolean)

  const parsed = names.map(parseFilename)
  const ok = parsed.filter(p => !p.error)
  const bad = parsed.filter(p => p.error)

  const used = [...new Set(ok.map(p => p.building.id))]
    .map(id => Object.values(BUILDINGS).find(b => b.id === id))

  console.log('// --- buildings ---')
  used.forEach(b =>
    console.log(`  B('${b.id}', '${b.name}', '${b.en}', ${b.lat}, ${b.lng}),`))

  console.log('\n// --- items ---')
  ok.sort((a, b) =>
      a.building.id.localeCompare(b.building.id) ||
      floorRank(a.floor) - floorRank(b.floor) ||
      a.itemId.localeCompare(b.itemId))
    .forEach(p =>
      console.log(`  I('${p.itemId}', '${p.building.id}', '${p.floor}', '${p.type}', ` +
        `'TODO landmark', '${p.note}'${p.type === 'toilet' ? ', 0, 0' : ''}),`))

  console.error(`\n${ok.length} parsed, ${bad.length} skipped`)
  bad.forEach(b => console.error(`  SKIPPED (${b.error}): ${b.filename}`))
  const missing = ok.filter(p => p.type === 'toilet').length
  console.error(`\n${missing} toilets start at 0/0 reports — that is honest, not a bug.`)
  console.error('Fill in the TODO landmarks; a photo alone will not tell someone which corridor.')
}

function floorRank(f) { return f[0] === 'B' ? -parseInt(f.slice(1), 10) : parseInt(f, 10) }

main()
