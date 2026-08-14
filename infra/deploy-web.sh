#!/usr/bin/env bash
# Publish the front end to Amplify Hosting.
#
#   bash infra/deploy-web.sh
#
# Uses Amplify's manual deployment (zip upload) rather than connecting a Git
# repository — that path needs an interactive GitHub OAuth handshake, which
# Learner Lab cannot complete. Same result: a public HTTPS URL.
#
# Safe to re-run; each run publishes a new version to the same URL.

set -euo pipefail

REGION=us-east-1
APP_NAME=freshman-map
BRANCH=main

echo "==> app"
APP_ID=$(aws amplify list-apps --region "$REGION" \
  --query "apps[?name=='$APP_NAME'].appId | [0]" --output text 2>/dev/null || echo "None")

if [ "$APP_ID" = "None" ] || [ -z "$APP_ID" ]; then
  APP_ID=$(aws amplify create-app --name "$APP_NAME" --region "$REGION" \
    --query 'app.appId' --output text)
  echo "    created $APP_ID"
else
  echo "    exists $APP_ID"
fi

echo "==> branch"
if aws amplify get-branch --app-id "$APP_ID" --branch-name "$BRANCH" --region "$REGION" >/dev/null 2>&1; then
  echo "    exists"
else
  aws amplify create-branch --app-id "$APP_ID" --branch-name "$BRANCH" --region "$REGION" >/dev/null
  echo "    created"
fi

echo "==> packaging site"
# Ship only what the browser needs. photos/ lives in S3, infra/ and tools/ are
# build-time only, and .git would be both large and pointless.
BUILD=infra/.web
rm -rf "$BUILD"; mkdir -p "$BUILD/site"
cp index.html styles.css "$BUILD/site/"
cp -r src "$BUILD/site/"

# Packaging is fussier than it looks — two things break Amplify silently, and
# in both cases index.html serves fine while every module 404s:
#   1. PowerShell's Compress-Archive writes entries with backslashes
#      (src\api.js). The zip spec requires forward slashes.
#   2. A directory record — an entry literally named "src/" — makes Amplify
#      skip that whole folder. shutil.make_archive writes them; we must not.
# Writing file entries only, with forward slashes, avoids both.
python - "$BUILD" <<'ZIPPY'
import os, sys, zipfile
build = sys.argv[1]
root = os.path.join(build, 'site')
with zipfile.ZipFile(os.path.join(build, 'site.zip'), 'w', zipfile.ZIP_DEFLATED) as z:
    for dirpath, _, files in os.walk(root):
        for f in files:
            full = os.path.join(dirpath, f)
            z.write(full, os.path.relpath(full, root).replace(os.sep, '/'))
ZIPPY
head -c2 "$BUILD/site.zip" | grep -q PK || { echo "Packaging produced a non-zip file." >&2; exit 1; }
echo "    $(du -h "$BUILD/site.zip" | cut -f1)"

echo "==> deployment"
read -r JOB_ID UPLOAD_URL <<<"$(aws amplify create-deployment \
  --app-id "$APP_ID" --branch-name "$BRANCH" --region "$REGION" \
  --query '[jobId,zipUploadUrl]' --output text)"

curl -s -X PUT -H 'Content-Type: application/zip' \
  --upload-file "$BUILD/site.zip" "$UPLOAD_URL" >/dev/null
echo "    uploaded"

aws amplify start-deployment --app-id "$APP_ID" --branch-name "$BRANCH" \
  --job-id "$JOB_ID" --region "$REGION" >/dev/null

printf '    building'
for _ in $(seq 1 40); do
  STATUS=$(aws amplify get-job --app-id "$APP_ID" --branch-name "$BRANCH" \
    --job-id "$JOB_ID" --region "$REGION" --query 'job.summary.status' --output text)
  [ "$STATUS" = "SUCCEED" ] && break
  [ "$STATUS" = "FAILED" ] && { echo; echo "    deployment FAILED" >&2; exit 1; }
  printf '.'
  sleep 5
done
echo " $STATUS"
rm -rf "$BUILD"

URL="https://${BRANCH}.${APP_ID}.amplifyapp.com"

echo "==> smoke test"
sleep 5
CODE=$(curl -s -o /dev/null -m 25 -w '%{http_code}' "$URL")
MODULE=$(curl -s -o /dev/null -m 25 -w '%{http_code}' "$URL/src/api.js")

echo
echo "  site      $URL"
echo "  index     HTTP $CODE"
echo "  module    HTTP $MODULE   (ES modules must be served, not 404)"
echo "  ready     $([ "$CODE" = "200" ] && [ "$MODULE" = "200" ] && echo 'yes ✓' || echo 'NO ✗')"
echo
echo "  This is the URL for the QR code. Open it on a phone before demo day."
