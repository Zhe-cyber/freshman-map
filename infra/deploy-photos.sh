#!/usr/bin/env bash
# Move the survey photos out of git and into S3.
#
#   bash infra/deploy-photos.sh
#
# Prints the base URL. Put it into PHOTO_BASE in src/api.js and the whole app
# switches — data.js keeps storing plain filenames, so no records change.
#
# Why bother: photos/ is ~42 MB and git keeps every version of every file
# forever. Every clone pays for it, and Amplify would ship all of it with the
# code on every build. In S3 it costs about a tenth of a cent a month.

set -euo pipefail

REGION=us-east-1
ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
BUCKET="freshmanmap-photos-${ACCOUNT}"     # bucket names are globally unique

echo "==> bucket $BUCKET"
if aws s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then
  echo "    exists"
else
  # us-east-1 is the one region that rejects a LocationConstraint
  aws s3api create-bucket --bucket "$BUCKET" --region "$REGION" >/dev/null
  echo "    created"
fi

echo "==> public read"
# Photos are meant to be visible to anyone using the app. Nothing private goes
# in this bucket — survey shots of corridors and doors only.
aws s3api put-public-access-block --bucket "$BUCKET" \
  --public-access-block-configuration \
  "BlockPublicAcls=false,IgnorePublicAcls=false,BlockPublicPolicy=false,RestrictPublicBuckets=false" \
  --region "$REGION" >/dev/null

cat > /tmp/fm-policy.json <<POLICY
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "PublicReadPhotos",
    "Effect": "Allow",
    "Principal": "*",
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::${BUCKET}/*"
  }]
}
POLICY
aws s3api put-bucket-policy --bucket "$BUCKET" --policy file:///tmp/fm-policy.json --region "$REGION"
rm -f /tmp/fm-policy.json
echo "    readable"

echo "==> CORS"
# The app fetches these from a different origin than the bucket.
cat > /tmp/fm-cors.json <<'CORS'
{"CORSRules":[{"AllowedHeaders":["*"],"AllowedMethods":["GET","HEAD"],
  "AllowedOrigins":["*"],"MaxAgeSeconds":86400}]}
CORS
aws s3api put-bucket-cors --bucket "$BUCKET" --cors-configuration file:///tmp/fm-cors.json --region "$REGION"
rm -f /tmp/fm-cors.json
echo "    set"

echo "==> uploading $(ls photos/*.jpg 2>/dev/null | wc -l) photos"
# A year of cache: filenames are content-stable (<itemId>.jpg), and a changed
# photo means a re-upload anyway.
aws s3 sync photos/ "s3://${BUCKET}/" \
  --exclude "*" --include "*.jpg" --include "*.jpeg" --include "*.png" \
  --content-type "image/jpeg" \
  --cache-control "public, max-age=31536000" \
  --region "$REGION" --only-show-errors
COUNT=$(aws s3 ls "s3://${BUCKET}/" --region "$REGION" | grep -c "\.jpg" || true)
echo "    $COUNT objects in the bucket"

URL="https://${BUCKET}.s3.${REGION}.amazonaws.com/"

echo "==> smoke test"
SAMPLE=$(basename "$(ls photos/*.jpg | head -1)")
CODE=$(curl -s -o /dev/null -m 20 -w '%{http_code}' "${URL}${SAMPLE}")
TYPE=$(curl -sI -m 20 "${URL}${SAMPLE}" | grep -i '^content-type' | tr -d '\r')

echo
echo "  base     $URL"
echo "  sample   ${SAMPLE} -> HTTP $CODE  ($TYPE)"
echo "  public   $([ "$CODE" = "200" ] && echo 'yes ✓' || echo 'NO ✗ — check the bucket policy')"
echo
echo "  Set this in src/api.js:"
echo "        const PHOTO_BASE = '$URL'"
echo
echo "  Then photos/ can leave git:"
echo "        git rm -r --cached photos && echo 'photos/' >> .gitignore"
