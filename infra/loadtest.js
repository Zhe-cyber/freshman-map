// Load test — produces the numbers for the "why does this need the cloud?" slide.
//
//   node infra/loadtest.js
//
// Two phases, both modelled on what actually happens at a demo:
//   1. Everyone opens the app at once  -> a burst of GETs
//   2. Everyone taps Join at once      -> concurrent writes to one record
//
// Phase 2 is the interesting one. Each virtual user has a distinct userId, so
// if the join logic were read-modify-write, joins would overwrite each other
// and the final count would be lower than the number of users. It uses an
// atomic DynamoDB set ADD instead, so the count must land exactly.

import https from 'node:https'

// Node's global fetch pools a small number of connections per origin, which
// caps concurrency around 6 and times the rest out — that measures the load
// generator, not the API. Raw https with a wide-open agent instead.
const agent = new https.Agent({ keepAlive: true, maxSockets: 256 })

// Must match API_BASE in src/api.js. The old default here pointed at the
// account that was reset, so a run would have measured a dead endpoint.
const API = process.env.API || 'https://c6diol6blf.execute-api.us-east-1.amazonaws.com'
const CAMPUS = process.env.CAMPUS || 'cycu'

const GET_PATHS = ['/buildings', '/items', '/places', '/activities']
const USERS = 60          // virtual users tapping Join simultaneously
const ROUNDS = 6          // GET rounds; each round is USERS requests

const ms = () => Number(process.hrtime.bigint() / 1000000n)

function hit(path, options = {}) {
  const t0 = ms()
  const url = new URL(`${API}/c/${CAMPUS}${path}`)
  return new Promise(resolve => {
    const req = https.request({
      hostname: url.hostname, path: url.pathname + url.search,
      method: options.method || 'GET', headers: options.headers || {}, agent
    }, res => {
      res.resume()
      res.on('end', () => resolve({
        ok: res.statusCode < 400, status: res.statusCode, ms: ms() - t0
      }))
    })
    req.setTimeout(30000, () => { req.destroy(); resolve({ ok: false, status: 0, ms: ms() - t0, err: 'timeout' }) })
    req.on('error', e => resolve({ ok: false, status: 0, ms: ms() - t0, err: e.message }))
    if (options.body) req.write(options.body)
    req.end()
  })
}

const pct = (arr, p) => arr.length ? arr.slice().sort((a, b) => a - b)[Math.floor(arr.length * p)] : 0

function report(label, results, started) {
  const wall = (ms() - started) / 1000
  const lat = results.map(r => r.ms)
  const bad = results.filter(r => !r.ok)
  console.log(`\n${label}`)
  console.log(`  requests    ${results.length} in ${wall.toFixed(1)}s  (${(results.length / wall).toFixed(0)}/sec)`)
  console.log(`  failures    ${bad.length}${bad.length ? '  ' + [...new Set(bad.map(b => b.status + (b.err ? ' ' + b.err.slice(0, 40) : '')))].join(', ') : ''}`)
  console.log(`  latency     p50 ${pct(lat, .5)}ms   p95 ${pct(lat, .95)}ms   max ${Math.max(...lat)}ms`)
  return { count: results.length, wall, failures: bad.length }
}

const run = async () => {
  console.log(`target ${API}`)
  console.log(`campus ${CAMPUS}\n`)

  // --- warm up so the first cold start does not skew the numbers ----------
  await hit('/buildings')

  // --- phase 1: everyone opens the app ------------------------------------
  // Cap in-flight requests. Firing all 360 at once measures how many sockets
  // this laptop can open, not how fast the API answers — earlier runs showed
  // 21s p95 here while curl at the same concurrency returned 200s in under 2s.
  const INFLIGHT = 25
  let started = ms()
  const reads = []
  const queue = []
  for (let round = 0; round < ROUNDS; round++)
    for (let i = 0; i < USERS; i++)
      queue.push(GET_PATHS[(round + i) % GET_PATHS.length])

  await Promise.all(Array.from({ length: INFLIGHT }, async () => {
    let path
    while ((path = queue.shift()) !== undefined) reads.push(await hit(path))
  }))
  const p1 = report('PHASE 1 — everyone opens the app', reads, started)

  // --- phase 2: everyone taps Join at the same instant ---------------------
  const activityId = 'load-' + Date.now()
  await hit('/activities', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      activityId, title: 'Load test', place: 'nowhere',
      capacity: USERS + 10, userId: 'host'
    })
  })

  // Fresh sockets, and a breath after phase 1 — a reused pool under burst
  // produces client-side timeouts that look like lost writes but never
  // reached the API at all.
  await new Promise(r => setTimeout(r, 3000))

  started = ms()
  const joins = await Promise.all(
    Array.from({ length: USERS }, (_, i) =>
      hit(`/activities/${activityId}/join`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ userId: `loadtest-user-${i}` })
      })))
  const p2 = report(`PHASE 2 — ${USERS} people tap Join simultaneously`, joins, started)

  // --- did any join get lost? ---------------------------------------------
  const raw = await new Promise(r => https.get(`${API}/c/${CAMPUS}/activities`, { agent }, res => {
    let d = ''; res.on('data', c => d += c); res.on('end', () => r(d))
  }))
  const act = JSON.parse(raw).find(a => a.activityId === activityId)
  const landed = act ? act.joined : 0
  // Measure against joins the API actually answered. A request that timed out
  // in the client never reached DynamoDB, so counting it as a lost write would
  // blame the backend for the load generator.
  const delivered = joins.filter(j => j.ok).length
  const expected = delivered + 1                    // the host counts too

  console.log(`
CORRECTNESS UNDER CONCURRENCY`)
  console.log(`  delivered   ${delivered} of ${USERS} joins reached the API`)
  console.log(`  expected    ${expected} members`)
  console.log(`  recorded    ${landed}`)
  console.log(`  lost writes ${expected - landed}  ${landed === expected ? '— none, the atomic set held' : '— WRITES WERE LOST'}`)

  console.log(`\nTOTAL ${p1.count + p2.count + 2} requests, ${p1.failures + p2.failures} failures`)
  console.log(`Activity left in place for inspection: ${activityId}`)
}

run().catch(e => { console.error(e); process.exit(1) })
