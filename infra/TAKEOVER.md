# Rebuilding the stack in a different AWS account

Learner Lab accounts get reset, and when that happens every resource is
deleted. The code is not lost — this rebuilds the whole backend somewhere else
in about ten minutes. Whoever runs this becomes the **demo account**.

---

## 0. Check you are in the right lab — do this first

AWS Academy has several labs and they do not all grant the same permissions.
Only the **Learner Lab** can create Lambda, Cognito and Amplify.

```bash
aws iam get-role --role-name LabRole --query "Role.Arn"
```

- Returns an ARN → you are in the Learner Lab, carry on.
- `NoSuchEntity` → **wrong lab.** Go back to the course and open *Learner Lab*
  specifically. Nothing below will work until this returns an ARN.

This exact mistake cost us an hour: DynamoDB and S3 worked, Lambda and Cognito
were denied, and it looked like the account had been disabled.

---

## 1. Get the photos

`photos/` is **not in git** — 84 files, ~42 MB, deliberately excluded so clones
stay small. A fresh clone has none.

Ask whoever has them to send the folder, then put it at `photos/` in the repo.
If the previous S3 bucket still exists:

```bash
aws s3 sync s3://freshmanmap-photos-OLDACCOUNTID/ photos/
```

Without the photos everything still works — item detail just shows the
placeholder instead of a picture.

---

## 2. Credentials

Start the lab, open **AWS Details → AWS CLI**, and paste all four lines into
`~/.aws/credentials` (Windows: `C:\Users\<you>\.aws\credentials`).

Replace the whole file — two `[default]` blocks means the first one wins, and
that will be the expired one.

Verify with an operation that touches a resource. `aws sts get-caller-identity`
is **not** a valid check: it succeeds even when the credentials are cancelled.

```bash
aws dynamodb list-tables --region us-east-1
```

---

## 3. Deploy, in this order

```bash
bash infra/deploy.sh
```
```bash
node infra/seed.js
```
```bash
bash infra/deploy-auth.sh
```
```bash
bash infra/deploy-photos.sh
```

Each one prints the value you need next. All are safe to re-run.

---

## 4. Paste the three new values in

| Script printed | Goes in | Line |
|---|---|---|
| API URL | `src/api.js` | `const API_BASE = ...` |
| Cognito client id | `src/auth.js` | `const CLIENT_ID = ...` |
| S3 base URL | `src/api.js` | `const PHOTO_BASE = ...` |

The bucket name contains the account id, so it differs per account.

**Commit and push these.** Everyone's build must point at the same backend, or
half the team will be testing against a stack nobody is demoing.

---

## 5. Publish the site

```bash
bash infra/deploy-web.sh
```

This prints a **new** Amplify URL — the app id changes per account. That URL is
the QR code. Generate the code from whatever it prints on the day; never print
it in advance.

---

## 6. Check it actually works

```bash
bash infra/loadtest.js
```

Or by hand: open the site, sign up, tap a building, open an item, join an
activity, send a chat message. Two minutes, and it catches the things a script
does not.

---

## What does not survive a rebuild

- **Registered users** — the Cognito pool is new, everyone signs up again
- **Places and activities created through the app** — seeded data comes back
  from `seed.js`, user-created content does not
- **The site URL** — new app id, new address

## Offline fallback

If no lab is available at all, the app runs entirely from `src/data.js`:

```javascript
const API_BASE = ''          // src/api.js
const PHOTO_BASE = 'photos/' // src/api.js
```

```bash
python -m http.server 8099
```

Map, food, BuddyUp, countdowns and photos all work. What you lose is anything
shared between devices — joins and chat become local only. It is a genuine
fallback for a demo, not a broken state.
