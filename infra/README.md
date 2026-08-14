# Backend

Learner Lab gives every student a **separate, isolated AWS account**. You cannot
share a DynamoDB table, and you cannot add each other as IAM users.

So we do not collaborate in AWS. **We collaborate in git**, and each person runs
the same script to stand up an identical stack in their own lab. One account is
nominated as the demo account; the others are for testing.

## Deploy

1. Start your lab. Open **AWS Details → AWS CLI** and paste all three values
   (including `aws_session_token`) into `~/.aws/credentials`. They expire when
   the session ends — re-copy them every time.
2. ```
   bash infra/deploy.sh
   ```
3. Put the printed URL into `API_BASE` at the top of `src/api.js`.
4. ```
   node infra/seed.js
   ```

Re-running `deploy.sh` is safe; it creates or updates.

## What it builds

| Resource | Name |
|---|---|
| DynamoDB | `freshmanmap` — `pk=CAMPUS#<id>`, `sk=BLDG#/ITEM#/PLACE#/ACT#` |
| Lambda | `freshmanmap-api` (runs as `LabRole`) |
| HTTP API | `freshmanmap`, CORS open |

## Learner Lab notes

- Region is **us-east-1**. Nothing else is available.
- Lambda **must** use the pre-made `LabRole`. You cannot create roles.
- Sessions expire (~4h) and take your credentials with them. The resources
  survive; only your CLI access dies.
- Start a **fresh session right before the demo**, and record a backup video.
  A session timing out during Q&A ends the demo with nothing to show.

## Cost

Everything here is serverless and pay-per-request — a few cents for the sprint.
Never create anything with an hourly rate: RDS/Aurora is about $12/day and
OpenSearch Serverless about $23/day, either of which eats the remaining credit
in a day or two.
