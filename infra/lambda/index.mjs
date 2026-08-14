// Freshman Map API — one Lambda behind an HTTP API.
//
// Routes (all scoped by campus, which is our multi-tenancy):
//   GET  /c/{campusId}/buildings
//   GET  /c/{campusId}/buildings/{buildingId}/items
//   GET  /c/{campusId}/places
//   GET  /c/{campusId}/activities
//   POST /c/{campusId}/activities
//   POST /c/{campusId}/activities/{activityId}/join
//   POST /c/{campusId}/places
//
// DynamoDB single table `freshmanmap`:
//   pk = CAMPUS#<campusId>   sk = BLDG#<id> | ITEM#<id> | PLACE#<id> | ACT#<id>

import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient, QueryCommand, PutCommand, UpdateCommand, GetCommand
} from '@aws-sdk/lib-dynamodb'

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const TABLE = process.env.TABLE || 'freshmanmap'

// CORS is also set on the API itself, but the quick-create $default route
// swallows OPTIONS before API Gateway can answer the preflight — so the
// function returns the headers too. Belt and braces, and it keeps working
// if someone edits the API's CORS config in the console.
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,OPTIONS',
  'access-control-allow-headers': 'content-type',
  'access-control-max-age': '86400'
}

const json = (statusCode, body) => ({
  statusCode,
  headers: { 'content-type': 'application/json', ...CORS },
  body: JSON.stringify(body)
})

const pk = campusId => `CAMPUS#${campusId}`

async function bySkPrefix(campusId, prefix) {
  const r = await db.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'pk = :p AND begins_with(sk, :s)',
    ExpressionAttributeValues: { ':p': pk(campusId), ':s': prefix }
  }))
  return (r.Items || []).map(({ pk, sk, ...rest }) => rest)
}

export const handler = async (event) => {
  const method = event.requestContext?.http?.method || 'GET'
  const path = event.rawPath || '/'
  const seg = path.split('/').filter(Boolean)      // ['c','cycu','buildings',...]

  // Answer the browser's preflight before anything else.
  if (method === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' }

  try {
    if (path === '/' || path === '/health') return json(200, { ok: true })

    if (seg[0] !== 'c' || !seg[1]) return json(404, { error: 'not found' })
    const campusId = decodeURIComponent(seg[1])
    const body = event.body ? JSON.parse(event.body) : {}

    // GET /c/{campus}/buildings
    if (method === 'GET' && seg[2] === 'buildings' && !seg[3])
      return json(200, await bySkPrefix(campusId, 'BLDG#'))

    // GET /c/{campus}/buildings/{id}/items
    if (method === 'GET' && seg[2] === 'buildings' && seg[3] && seg[4] === 'items') {
      const items = await bySkPrefix(campusId, 'ITEM#')
      return json(200, items.filter(i => i.buildingId === decodeURIComponent(seg[3])))
    }

    // GET /c/{campus}/items — the app loads every item once and caches it.
    // At ~50 items per campus one query beats one request per building.
    if (method === 'GET' && seg[2] === 'items')
      return json(200, await bySkPrefix(campusId, 'ITEM#'))

    if (method === 'GET' && seg[2] === 'places')
      return json(200, await bySkPrefix(campusId, 'PLACE#'))

    if (method === 'GET' && seg[2] === 'activities')
      return json(200, await bySkPrefix(campusId, 'ACT#'))

    // POST /c/{campus}/places
    if (method === 'POST' && seg[2] === 'places') {
      if (!body.name) return json(400, { error: 'name required' })
      const place = {
        ...body,
        campusId,
        placeId: body.placeId || 'user-' + Date.now(),
        createdAt: new Date().toISOString()
      }
      await db.send(new PutCommand({
        TableName: TABLE,
        Item: { pk: pk(campusId), sk: `PLACE#${place.placeId}`, ...place }
      }))
      return json(201, place)
    }

    // POST /c/{campus}/activities
    if (method === 'POST' && seg[2] === 'activities' && !seg[3]) {
      if (!body.title) return json(400, { error: 'title required' })
      const activity = {
        ...body,
        campusId,
        activityId: body.activityId || 'a-' + Date.now(),
        joined: 1,
        joinedBy: body.userId ? [body.userId] : [],
        createdAt: new Date().toISOString()
      }
      await db.send(new PutCommand({
        TableName: TABLE,
        Item: { pk: pk(campusId), sk: `ACT#${activity.activityId}`, ...activity }
      }))
      return json(201, activity)
    }

    // POST /c/{campus}/activities/{id}/join
    // The interesting one: many devices hit this at once during the demo.
    // ADD on a set is atomic, so concurrent joins cannot lose each other.
    if (method === 'POST' && seg[2] === 'activities' && seg[3] && seg[4] === 'join') {
      const activityId = decodeURIComponent(seg[3])
      const userId = body.userId
      if (!userId) return json(400, { error: 'userId required' })

      const key = { pk: pk(campusId), sk: `ACT#${activityId}` }
      const current = await db.send(new GetCommand({ TableName: TABLE, Key: key }))
      if (!current.Item) return json(404, { error: 'no such activity' })

      // First join creates a DynamoDB Set; the document client hands that back
      // as a JS Set, not an array. Normalise before touching it.
      const raw = current.Item.joinedBy
      const joined = raw instanceof Set ? [...raw] : Array.isArray(raw) ? raw : []
      const already = joined.includes(userId)
      const capacity = current.Item.capacity || 4
      if (!already && joined.length >= capacity)
        return json(409, { error: 'full', joined: capacity, capacity })

      const updated = await db.send(new UpdateCommand({
        TableName: TABLE,
        Key: key,
        UpdateExpression: already
          ? 'DELETE joinedBy :u'
          : 'ADD joinedBy :u',
        ExpressionAttributeValues: { ':u': new Set([userId]) },
        ReturnValues: 'ALL_NEW'
      }))
      const joinedBy = [...(updated.Attributes.joinedBy || [])]
      return json(200, {
        activityId, joined: joinedBy.length, capacity, joinedByMe: !already
      })
    }

    return json(404, { error: 'not found', path, method })
  } catch (err) {
    console.error(err)
    return json(500, { error: err.message })
  }
}
