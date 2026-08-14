// Load src/data.js into DynamoDB. Re-runnable — writes are idempotent puts.
//
//   node infra/seed.js            # seed the default campus
//   node infra/seed.js ntu        # seed a second campus for the demo
//
// Needs valid Learner Lab credentials in the environment or ~/.aws/credentials.

import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, BatchWriteCommand } from '@aws-sdk/lib-dynamodb'
import { MOCK } from '../src/data.js'

const REGION = 'us-east-1'
const TABLE = process.env.TABLE || 'freshmanmap'
const campusId = process.argv[2] || 'cycu'

const db = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }))
const pk = `CAMPUS#${campusId}`

const rows = [
  ...MOCK.buildings.map(b => ({ pk, sk: `BLDG#${b.buildingId}`, ...b, campusId })),
  ...MOCK.items.map(i => ({ pk, sk: `ITEM#${i.itemId}`, ...i, campusId })),
  ...MOCK.places.map(p => ({ pk, sk: `PLACE#${p.placeId}`, ...p, campusId })),
  ...(MOCK.activities || []).map(a => ({ pk, sk: `ACT#${a.activityId}`, ...a, campusId }))
]

const chunks = []
for (let i = 0; i < rows.length; i += 25) chunks.push(rows.slice(i, i + 25))

let written = 0
for (const chunk of chunks) {
  await db.send(new BatchWriteCommand({
    RequestItems: { [TABLE]: chunk.map(Item => ({ PutRequest: { Item } })) }
  }))
  written += chunk.length
  process.stdout.write(`\rwriting ${written}/${rows.length}`)
}

console.log(`\n\ncampus ${campusId}:`)
console.log(`  ${MOCK.buildings.length} buildings`)
console.log(`  ${MOCK.items.length} items`)
console.log(`  ${MOCK.places.length} places`)
console.log(`  ${(MOCK.activities || []).length} activities`)
console.log(`\ndone — ${written} records in ${TABLE}`)
