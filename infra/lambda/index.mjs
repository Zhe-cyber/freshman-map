// Freshman Map API — one Lambda behind an HTTP API.
//
// Routes:
//   GET    /c/{campusId}/buildings
//   GET    /c/{campusId}/buildings/{buildingId}/items
//   GET    /c/{campusId}/items
//   GET    /c/{campusId}/places
//   POST   /c/{campusId}/places
//   GET    /c/{campusId}/activities
//   POST   /c/{campusId}/activities
//   POST   /c/{campusId}/activities/{activityId}/join
//   DELETE /c/{campusId}/activities/{activityId}
//
// DynamoDB single table `freshmanmap`:
//
//   pk = CAMPUS#<campusId>
//   sk = BLDG#<id>
//      | ITEM#<id>
//      | PLACE#<id>
//      | ACT#<id>

import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient,
  QueryCommand,
  PutCommand,
  UpdateCommand,
  GetCommand,
  DeleteCommand
} from '@aws-sdk/lib-dynamodb'

const db = DynamoDBDocumentClient.from(new DynamoDBClient({}))
const TABLE = process.env.TABLE || 'freshmanmap'

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'access-control-allow-headers': 'content-type',
  'access-control-max-age': '86400'
}

const json = (statusCode, body) => ({
  statusCode,
  headers: {
    'content-type': 'application/json',
    ...CORS
  },
  body: JSON.stringify(body)
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const pk = campusId => `CAMPUS#${campusId}`

async function bySkPrefix(campusId, prefix) {
  const r = await db.send(new QueryCommand({
    TableName: TABLE,
    KeyConditionExpression: 'pk = :p AND begins_with(sk, :s)',
    ExpressionAttributeValues: {
      ':p': pk(campusId),
      ':s': prefix
    }
  }))

  return (r.Items || []).map(({ pk, sk, ...rest }) => rest)
}

function normaliseJoinedBy(value) {
  if (value instanceof Set) {
    return [...value]
  }

  if (Array.isArray(value)) {
    return value
  }

  return []
}

// ---------------------------------------------------------------------------
// Lambda
// ---------------------------------------------------------------------------

export const handler = async (event) => {
  const method = event.requestContext?.http?.method || 'GET'
  const path = event.rawPath || '/'
  const seg = path.split('/').filter(Boolean)

  // Browser CORS preflight.
  if (method === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: CORS,
      body: ''
    }
  }

  try {
    // -----------------------------------------------------------------------
    // Health check
    // -----------------------------------------------------------------------

    if (path === '/' || path === '/health') {
      return json(200, { ok: true })
    }

    // -----------------------------------------------------------------------
    // Campus validation
    // -----------------------------------------------------------------------

    if (seg[0] !== 'c' || !seg[1]) {
      return json(404, { error: 'not found' })
    }

    const campusId = decodeURIComponent(seg[1])

    let body = {}

    try {
      body = event.body ? JSON.parse(event.body) : {}
    } catch {
      return json(400, { error: 'invalid JSON body' })
    }

    // -----------------------------------------------------------------------
    // BUILDINGS
    // GET /c/{campus}/buildings
    // -----------------------------------------------------------------------

    if (
      method === 'GET' &&
      seg[2] === 'buildings' &&
      !seg[3]
    ) {
      return json(
        200,
        await bySkPrefix(campusId, 'BLDG#')
      )
    }

    // -----------------------------------------------------------------------
    // BUILDING ITEMS
    // GET /c/{campus}/buildings/{buildingId}/items
    // -----------------------------------------------------------------------

    if (
      method === 'GET' &&
      seg[2] === 'buildings' &&
      seg[3] &&
      seg[4] === 'items'
    ) {
      const items = await bySkPrefix(campusId, 'ITEM#')

      return json(
        200,
        items.filter(
          i => i.buildingId === decodeURIComponent(seg[3])
        )
      )
    }

    // -----------------------------------------------------------------------
    // ALL ITEMS
    // GET /c/{campus}/items
    // -----------------------------------------------------------------------

    if (
      method === 'GET' &&
      seg[2] === 'items'
    ) {
      return json(
        200,
        await bySkPrefix(campusId, 'ITEM#')
      )
    }

    // -----------------------------------------------------------------------
    // PLACES
    // GET /c/{campus}/places
    // -----------------------------------------------------------------------

    if (
      method === 'GET' &&
      seg[2] === 'places'
    ) {
      return json(
        200,
        await bySkPrefix(campusId, 'PLACE#')
      )
    }

    // -----------------------------------------------------------------------
    // CREATE PLACE
    // POST /c/{campus}/places
    // -----------------------------------------------------------------------

    if (
      method === 'POST' &&
      seg[2] === 'places'
    ) {
      if (!body.name) {
        return json(400, {
          error: 'name required'
        })
      }

      const place = {
        ...body,
        campusId,
        placeId: body.placeId || 'user-' + Date.now(),
        createdAt: new Date().toISOString()
      }

      await db.send(new PutCommand({
        TableName: TABLE,
        Item: {
          pk: pk(campusId),
          sk: `PLACE#${place.placeId}`,
          ...place
        }
      }))

      return json(201, place)
    }

    // -----------------------------------------------------------------------
    // ACTIVITIES
    // GET /c/{campus}/activities
    // -----------------------------------------------------------------------

    if (
      method === 'GET' &&
      seg[2] === 'activities' &&
      !seg[3]
    ) {
      const acts = await bySkPrefix(
        campusId,
        'ACT#'
      )

      return json(
        200,
        acts.map(a => {
          const joinedBy = normaliseJoinedBy(a.joinedBy)

          return {
            ...a,
            joinedBy,
            joined: joinedBy.length
          }
        })
      )
    }

    // -----------------------------------------------------------------------
    // CREATE ACTIVITY
    // POST /c/{campus}/activities
    // -----------------------------------------------------------------------

    if (
      method === 'POST' &&
      seg[2] === 'activities' &&
      !seg[3]
    ) {
      if (!body.title) {
        return json(400, {
          error: 'title required'
        })
      }

      const userId = body.userId || ''

      const activity = {
        ...body,
        campusId,

        activityId:
          body.activityId ||
          'a-' + Date.now(),

        // Creator becomes the first participant.
        //
        // joinedBy must be a string SET, matching what the join endpoint's
        // atomic ADD expects and what the seeder writes. A List here would
        // make the first join fail with "incorrect data type".
        //
        // DynamoDB rejects empty sets, so with no creator the attribute is
        // left off entirely rather than written empty.
        ...(userId ? { joinedBy: new Set([userId]) } : {}),

        joined: userId ? 1 : 0,

        createdAt:
          new Date().toISOString()
      }

      await db.send(new PutCommand({
        TableName: TABLE,
        Item: {
          pk: pk(campusId),
          sk: `ACT#${activity.activityId}`,
          ...activity
        }
      }))

      return json(201, activity)
    }

    // -----------------------------------------------------------------------
    // JOIN / LEAVE ACTIVITY
    //
    // POST /c/{campus}/activities/{activityId}/join
    //
    // joinedBy is stored as a DynamoDB List.
    // Therefore use SET, not ADD/DELETE.
    // -----------------------------------------------------------------------

    if (
      method === 'POST' &&
      seg[2] === 'activities' &&
      seg[3] &&
      seg[4] === 'join'
    ) {
      const activityId =
        decodeURIComponent(seg[3])

      const userId = body.userId

      if (!userId) {
        return json(400, {
          error: 'userId required'
        })
      }

      const key = {
        pk: pk(campusId),
        sk: `ACT#${activityId}`
      }

      const current = await db.send(
        new GetCommand({
          TableName: TABLE,
          Key: key
        })
      )

      if (!current.Item) {
        return json(404, {
          error: 'no such activity'
        })
      }

      const joined =
        normaliseJoinedBy(
          current.Item.joinedBy
        )

      const already =
        joined.includes(userId)

      const capacity =
        Number(current.Item.capacity) || 4

      // Cannot join a full activity.
      if (
        !already &&
        joined.length >= capacity
      ) {
        return json(409, {
          error: 'full',
          joined: joined.length,
          capacity
        })
      }

      // Toggle membership.
      //
      // This MUST be an atomic set operation, not read-modify-write. With
      // 'SET joinedBy = <list built in Lambda>', sixty people tapping Join at
      // once all read the same list, each appends only themselves, and each
      // overwrites the others — a load test lost 55 of 60 joins while every
      // request returned 200. It passes sequential testing, which is why it
      // looks fine by hand.
      //
      // ADD and DELETE on a string set are applied by DynamoDB itself, so
      // concurrent joins cannot clobber each other.
      const updated = await db.send(
        new UpdateCommand({
          TableName: TABLE,
          Key: key,

          UpdateExpression: already
            ? 'DELETE joinedBy :u'
            : 'ADD joinedBy :u',

          ExpressionAttributeValues: {
            ':u': new Set([userId])
          },

          ReturnValues: 'ALL_NEW'
        })
      )

      const finalJoinedBy =
        normaliseJoinedBy(
          updated.Attributes?.joinedBy
        )

      return json(200, {
        activityId,
        joined: finalJoinedBy.length,
        capacity,
        joinedByMe: !already
      })
    }

    // -----------------------------------------------------------------------
    // PUBLIC PROFILES
    //
    // GET  /c/{campus}/users?ids=a,b,c   -> the cards shown on an activity
    // PUT  /c/{campus}/users/{userId}    -> publish your own card
    //
    // Only the fields a user chose to share are stored here. The full profile
    // stays on their device; this is the subset other people can see when
    // deciding whether to join something.
    // -----------------------------------------------------------------------

    if (seg[2] === 'users') {
      if (method === 'GET' && !seg[3]) {
        const ids = (event.queryStringParameters?.ids || '')
          .split(',').map(s => s.trim()).filter(Boolean).slice(0, 25)
        if (!ids.length) return json(200, [])

        const found = await Promise.all(ids.map(id =>
          db.send(new GetCommand({
            TableName: TABLE,
            Key: { pk: pk(campusId), sk: `USER#${id}` }
          })).then(r => r.Item).catch(() => null)))

        return json(200, found.filter(Boolean).map(({ pk, sk, ...rest }) => rest))
      }

      if (method === 'PUT' && seg[3]) {
        const userId = decodeURIComponent(seg[3])
        // Whitelist, not passthrough: only these keys are ever published, so a
        // future private field cannot leak by being added to the profile form.
        const allowed = ['displayName', 'avatar', 'homeCountry',
                         'department', 'year', 'languages', 'interests', 'bio']
        const card = { userId, updatedAt: new Date().toISOString() }
        for (const k of allowed) if (body[k]) card[k] = String(body[k]).slice(0, 4000)

        await db.send(new PutCommand({
          TableName: TABLE,
          Item: { pk: pk(campusId), sk: `USER#${userId}`, ...card }
        }))
        return json(200, card)
      }
    }

    // -----------------------------------------------------------------------
    // ACTIVITY CHAT
    //
    // GET  /c/{campus}/activities/{activityId}/messages
    // POST /c/{campus}/activities/{activityId}/messages
    //
    // Messages are rows in the same table: sk = MSG#<activityId>#<timestamp>.
    // The timestamp in the sort key means a Query returns them already in
    // order — no sorting, no scan.
    //
    // Posting requires membership, checked on the server. A client-side check
    // alone would be decoration: anyone can POST to a public API directly.
    // -----------------------------------------------------------------------

    if (
      seg[2] === 'activities' &&
      seg[3] &&
      seg[4] === 'messages'
    ) {
      const activityId = decodeURIComponent(seg[3])

      if (method === 'GET') {
        // Reading is checked too, not just writing. Hiding the chat button in
        // the UI is not privacy — the API is public, and a non-member could
        // read a whole conversation with one curl. The panel tells users
        // "only people who joined can see this", so that has to be true here.
        const reader = event.queryStringParameters?.userId
        if (!reader) return json(400, { error: 'userId required' })

        const act = await db.send(new GetCommand({
          TableName: TABLE,
          Key: { pk: pk(campusId), sk: `ACT#${activityId}` }
        }))
        if (!act.Item) return json(404, { error: 'no such activity' })
        if (!normaliseJoinedBy(act.Item.joinedBy).includes(reader)) {
          return json(403, { error: 'join the activity first' })
        }

        const r = await db.send(new QueryCommand({
          TableName: TABLE,
          KeyConditionExpression: 'pk = :p AND begins_with(sk, :s)',
          ExpressionAttributeValues: {
            ':p': pk(campusId),
            ':s': `MSG#${activityId}#`
          },
          Limit: 200
        }))
        return json(200, (r.Items || []).map(({ pk, sk, ...rest }) => rest))
      }

      if (method === 'POST') {
        const { userId, name, text } = body
        if (!userId || !text?.trim()) {
          return json(400, { error: 'userId and text required' })
        }
        if (text.length > 500) {
          return json(400, { error: 'message too long' })
        }

        const act = await db.send(new GetCommand({
          TableName: TABLE,
          Key: { pk: pk(campusId), sk: `ACT#${activityId}` }
        }))
        if (!act.Item) return json(404, { error: 'no such activity' })

        const members = normaliseJoinedBy(act.Item.joinedBy)
        if (!members.includes(userId)) {
          return json(403, { error: 'join the activity first' })
        }

        const message = {
          activityId,
          messageId: Date.now() + '-' + Math.random().toString(36).slice(2, 7),
          userId,
          name: name || 'Someone',
          text: text.trim(),
          sentAt: new Date().toISOString()
        }

        await db.send(new PutCommand({
          TableName: TABLE,
          Item: {
            pk: pk(campusId),
            sk: `MSG#${activityId}#${message.messageId}`,
            ...message
          }
        }))

        return json(201, message)
      }
    }

    // -----------------------------------------------------------------------
    // DELETE ACTIVITY
    //
    // DELETE /c/{campus}/activities/{activityId}
    //
    // IMPORTANT:
    // Only the original creator (activity.userId)
    // is allowed to delete the activity.
    // -----------------------------------------------------------------------

    if (
      method === 'DELETE' &&
      seg[2] === 'activities' &&
      seg[3] &&
      !seg[4]
    ) {
      const activityId =
        decodeURIComponent(seg[3])

      const userId = body.userId

      if (!userId) {
        return json(400, {
          error: 'userId required'
        })
      }

      const key = {
        pk: pk(campusId),
        sk: `ACT#${activityId}`
      }

      const current = await db.send(
        new GetCommand({
          TableName: TABLE,
          Key: key
        })
      )

      if (!current.Item) {
        return json(404, {
          error: 'no such activity'
        })
      }

      // Only the creator can delete.
      if (
        !current.Item.userId ||
        current.Item.userId !== userId
      ) {
        return json(403, {
          error: 'only the activity creator can delete it'
        })
      }

      await db.send(
        new DeleteCommand({
          TableName: TABLE,
          Key: key
        })
      )

      return json(200, {
        activityId,
        deleted: true
      })
    }

    // -----------------------------------------------------------------------
    // Unknown route
    // -----------------------------------------------------------------------

    return json(404, {
      error: 'not found',
      path,
      method
    })

  } catch (err) {
    console.error(err)

    return json(500, {
      error: err?.message || 'internal server error'
    })
  }
}