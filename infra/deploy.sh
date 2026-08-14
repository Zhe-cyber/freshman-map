#!/usr/bin/env bash
# Stand up the whole Freshman Map backend in YOUR OWN Learner Lab account.
#
# Learner Lab gives every student a separate, isolated account — you cannot
# share a table or add each other as IAM users. So we don't collaborate in
# AWS: we collaborate in git, and each person runs this to get an identical
# stack. One of these accounts is the demo account; the rest are for testing.
#
#   1. Start your lab, open AWS Details -> AWS CLI, copy all three values into
#      ~/.aws/credentials (they include aws_session_token and expire each session)
#   2. bash infra/deploy.sh
#   3. Paste the printed URL into API_BASE in src/api.js
#
# Safe to re-run: everything is create-or-update.

set -euo pipefail

REGION=us-east-1          # Learner Lab is locked to us-east-1
TABLE=freshmanmap
FN=freshmanmap-api
API=freshmanmap

echo "==> checking credentials"
ACCOUNT=$(aws sts get-caller-identity --query Account --output text) || {
  echo "No valid credentials. Start the lab and re-copy AWS Details -> AWS CLI." >&2
  exit 1
}
ROLE="arn:aws:iam::${ACCOUNT}:role/LabRole"
echo "    account $ACCOUNT"

echo "==> DynamoDB table"
if aws dynamodb describe-table --table-name "$TABLE" --region "$REGION" >/dev/null 2>&1; then
  echo "    exists"
else
  aws dynamodb create-table \
    --table-name "$TABLE" \
    --billing-mode PAY_PER_REQUEST \
    --attribute-definitions AttributeName=pk,AttributeType=S AttributeName=sk,AttributeType=S \
    --key-schema AttributeName=pk,KeyType=HASH AttributeName=sk,KeyType=RANGE \
    --region "$REGION" >/dev/null
  aws dynamodb wait table-exists --table-name "$TABLE" --region "$REGION"
  echo "    created"
fi

echo "==> packaging lambda"
BUILD=$(mktemp -d)
cp infra/lambda/index.mjs "$BUILD/"
( cd "$BUILD" && zip -q function.zip index.mjs )
# @aws-sdk v3 is already present in the nodejs20.x runtime, so no npm install.

echo "==> lambda"
if aws lambda get-function --function-name "$FN" --region "$REGION" >/dev/null 2>&1; then
  aws lambda update-function-code \
    --function-name "$FN" --zip-file "fileb://$BUILD/function.zip" \
    --region "$REGION" >/dev/null
  echo "    code updated"
else
  aws lambda create-function \
    --function-name "$FN" \
    --runtime nodejs20.x \
    --role "$ROLE" \
    --handler index.handler \
    --timeout 10 \
    --environment "Variables={TABLE=$TABLE}" \
    --zip-file "fileb://$BUILD/function.zip" \
    --region "$REGION" >/dev/null
  aws lambda wait function-active --function-name "$FN" --region "$REGION"
  echo "    created"
fi
rm -rf "$BUILD"

echo "==> HTTP API"
API_ID=$(aws apigatewayv2 get-apis --region "$REGION" \
  --query "Items[?Name=='$API'].ApiId | [0]" --output text)

if [ "$API_ID" = "None" ] || [ -z "$API_ID" ]; then
  API_ID=$(aws apigatewayv2 create-api \
    --name "$API" \
    --protocol-type HTTP \
    --target "arn:aws:lambda:${REGION}:${ACCOUNT}:function:${FN}" \
    --cors-configuration 'AllowOrigins=*,AllowMethods=GET,AllowMethods=POST,AllowMethods=OPTIONS,AllowHeaders=content-type' \
    --region "$REGION" --query ApiId --output text)
  echo "    created $API_ID"
else
  # keep CORS correct even if someone changed it in the console
  aws apigatewayv2 update-api --api-id "$API_ID" \
    --cors-configuration 'AllowOrigins=*,AllowMethods=GET,AllowMethods=POST,AllowMethods=OPTIONS,AllowHeaders=content-type' \
    --region "$REGION" >/dev/null
  echo "    exists $API_ID"
fi

# API Gateway must be allowed to invoke the function. Ignore "already exists".
aws lambda add-permission \
  --function-name "$FN" \
  --statement-id apigw-invoke \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:${REGION}:${ACCOUNT}:${API_ID}/*" \
  --region "$REGION" >/dev/null 2>&1 || true

URL="https://${API_ID}.execute-api.${REGION}.amazonaws.com"

echo "==> smoke test"
sleep 3
CODE=$(curl -s -o /dev/null -w '%{http_code}' "$URL/health")
CORS=$(curl -sI -H 'Origin: https://example.com' "$URL/health" | grep -ci 'access-control-allow-origin' || true)

echo
echo "  API      $URL"
echo "  /health  HTTP $CODE"
echo "  CORS     $([ "$CORS" -gt 0 ] && echo 'header present ✓' || echo 'MISSING ✗ — fix before building anything else')"
echo
echo "  Next: set API_BASE in src/api.js to"
echo "        $URL"
echo "  Then: bash infra/seed.sh   (loads buildings, items and places)"
