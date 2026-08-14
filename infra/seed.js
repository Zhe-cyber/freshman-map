// Load src/data.js into DynamoDB. Re-runnable — plain puts, no deletes.
//
//   node infra/seed.js            # seed cycu
//   node infra/seed.js ntu        # seed a second campus for the demo
//
// Shells out to the AWS CLI rather than importing @aws-sdk, so the repo keeps
// its no-build, no-node_modules setup. Needs a live Learner Lab session.

import { execFileSync } from 'node:child_process'
import { writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { MOCK } from '../src/data.js'

const REGION = 'us-east-1'
const TABLE = process.env.TABLE || 'freshmanmap'
const campusId = process.argv[2] || 'cycu'
const pk = `CAMPUS#${campusId}`

// Minimal DynamoDB JSON marshaller — the CLI wants typed attribute values.
function av(v) {
  if (v === null || v === undefined) return { NULL: true }
  if (typeof v === 'string') return v === '' ? { NULL: true } : { S: v }
  if (typeof v === 'number') return { N: String(v) }
  if (typeof v === 'boolean') return { BOOL: v }
  if (Array.isArray(v)) return { L: v.map(av) }
  if (typeof v === 'object') return { M: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, av(x)])) }
  return { S: String(v) }
}
const item = obj => Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, av(v)]))

const rows = [
  ...MOCK.buildings.map(b => ({ pk, sk: `BLDG#${b.buildingId}`, ...b, campusId })),
  ...MOCK.items.map(i => ({ pk, sk: `ITEM#${i.itemId}`, ...i, campusId })),
  ...MOCK.places.map(p => ({ pk, sk: `PLACE#${p.placeId}`, ...p, campusId })),
  ...(MOCK.activities || []).map(a => ({ pk, sk: `ACT#${a.activityId}`, ...a, campusId }))
]

const dir = 'infra/.build'
mkdirSync(dir, { recursive: true })

let written = 0
for (let i = 0; i < rows.length; i += 25) {
  const chunk = rows.slice(i, i + 25)
  const file = `${dir}/batch-${i}.json`
  // The AWS CLI on Windows decodes paramfiles with the system codepage, so a
  // file containing raw UTF-8 Chinese fails with "could not be decoded".
  // Escaping every non-ASCII char is still valid JSON and is locale-proof.
  const payload = JSON.stringify({
    [TABLE]: chunk.map(r => ({ PutRequest: { Item: item(r) } }))
  }).replace(/[^\x00-\x7F]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'))
  writeFileSync(file, payload, 'ascii')
  try {
    execFileSync('aws', ['dynamodb', 'batch-write-item',
      '--request-items', `file://${file}`, '--region', REGION], { stdio: 'pipe' })
  } catch (e) {
    console.error(String.fromCharCode(10) + (e.stderr?.toString() || e.message))
    console.error('failing batch kept at ' + file)
    process.exit(1)
  }
  written += chunk.length
  process.stdout.write(`\rwriting ${written}/${rows.length}`)
}
rmSync(dir, { recursive: true, force: true })

console.log(`\n\ncampus ${campusId}`)
console.log(`  ${MOCK.buildings.length} buildings`)
console.log(`  ${MOCK.items.length} items`)
console.log(`  ${MOCK.places.length} places`)
console.log(`  ${(MOCK.activities || []).length} activities`)
console.log(`\n${written} records written to ${TABLE}`)
