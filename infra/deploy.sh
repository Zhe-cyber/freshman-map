#!/usr/bin/env bash
# Stand up the whole Freshman Map backend in YOUR OWN Learner Lab account.
#
# Learner Lab gives every student a separate, isolated account.
# Each person runs this script to create/update the same backend stack.
#
#   1. Start your lab and open AWS Details -> AWS CLI.
#   2. Copy the AWS credentials into ~/.aws/credentials.
#   3. bash infra/deploy.sh
#   4. Paste the printed API URL into src/api.js
#
# Safe to re-run: everything is create-or-update.

set -euo pipefail

REGION=us-east-1
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

# ---------------------------------------------------------------------------
# DynamoDB
# ---------------------------------------------------------------------------

echo "==> DynamoDB table"

if aws dynamodb describe-table \
  --table-name "$TABLE" \
  --region "$REGION" >/dev/null 2>&1; then

  echo "    exists"

else

  aws dynamodb create-table \
    --table-name "$TABLE" \
    --billing-mode PAY_PER_REQUEST \
    --attribute-definitions \
      AttributeName=pk,AttributeType=S \
      AttributeName=sk,AttributeType=S \
    --key-schema \
      AttributeName=pk,KeyType=HASH \
      AttributeName=sk,KeyType=RANGE \
    --region "$REGION" >/dev/null

  aws dynamodb wait table-exists \
    --table-name "$TABLE" \
    --region "$REGION"

  echo "    created"

fi

# ---------------------------------------------------------------------------
# Package Lambda
# ---------------------------------------------------------------------------

echo "==> packaging lambda"

BUILD=infra/.build

rm -rf "$BUILD"
mkdir -p "$BUILD"

cp infra/lambda/index.mjs "$BUILD/"

# @aws-sdk v3 is available in the Node.js 20.x Lambda runtime,
# so no npm install is required.
#
# Git Bash on Windows may not have zip.
# Fall back to PowerShell or Python.

(
  cd "$BUILD"

  if command -v zip >/dev/null 2>&1; then

    zip -q function.zip index.mjs

  elif command -v powershell >/dev/null 2>&1; then

    powershell -NoProfile -Command \
      "Compress-Archive -Path index.mjs -DestinationPath function.zip -Force" \
      >/dev/null

  elif command -v python >/dev/null 2>&1; then

    python -c \
      "import zipfile; zipfile.ZipFile('function.zip','w',zipfile.ZIP_DEFLATED).write('index.mjs')"

  else

    echo "No zip, powershell or python available to package the function." >&2
    exit 1

  fi

  # Verify ZIP signature.
  head -c2 function.zip | grep -q PK || {
    echo "Packaging produced a non-zip file." >&2
    exit 1
  }

)

# ---------------------------------------------------------------------------
# Lambda
# ---------------------------------------------------------------------------

echo "==> lambda"

if aws lambda get-function \
  --function-name "$FN" \
  --region "$REGION" >/dev/null 2>&1; then

  aws lambda update-function-code \
    --function-name "$FN" \
    --zip-file "fileb://$BUILD/function.zip" \
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

  aws lambda wait function-active \
    --function-name "$FN" \
    --region "$REGION"

  echo "    created"

fi

rm -rf "$BUILD"

# ---------------------------------------------------------------------------
# HTTP API Gateway
# ---------------------------------------------------------------------------

echo "==> HTTP API"

API_ID=$(aws apigatewayv2 get-apis \
  --region "$REGION" \
  --query "Items[?Name=='$API'].ApiId | [0]" \
  --output text)

# IMPORTANT:
# DELETE must be included here because BuddyUp uses:
#
# DELETE /c/{campus}/activities/{activityId}
#
# Without DELETE in API Gateway CORS, the browser blocks the request
# before Lambda can receive it.

CORS_CONFIG='{"AllowOrigins":["*"],"AllowMethods":["GET","POST","DELETE","OPTIONS"],"AllowHeaders":["content-type"]}'

if [ "$API_ID" = "None" ] || [ -z "$API_ID" ]; then

  API_ID=$(aws apigatewayv2 create-api \
    --name "$API" \
    --protocol-type HTTP \
    --target "arn:aws:lambda:${REGION}:${ACCOUNT}:function:${FN}" \
    --cors-configuration "$CORS_CONFIG" \
    --region "$REGION" \
    --query ApiId \
    --output text)

  echo "    created $API_ID"

else

  # Keep CORS correct even if somebody changed it in AWS Console.
  aws apigatewayv2 update-api \
    --api-id "$API_ID" \
    --cors-configuration "$CORS_CONFIG" \
    --region "$REGION" >/dev/null

  echo "    exists $API_ID"

fi

# ---------------------------------------------------------------------------
# Lambda permission for API Gateway
# ---------------------------------------------------------------------------

# API Gateway must be allowed to invoke Lambda.
# Ignore the error if the permission already exists.

aws lambda add-permission \
  --function-name "$FN" \
  --statement-id apigw-invoke \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:${REGION}:${ACCOUNT}:${API_ID}/*" \
  --region "$REGION" >/dev/null 2>&1 || true

URL="https://${API_ID}.execute-api.${REGION}.amazonaws.com"

# ---------------------------------------------------------------------------
# Smoke test
# ---------------------------------------------------------------------------

echo "==> smoke test"

sleep 3

# Health check
CODE=$(curl -s \
  -o /dev/null \
  -w '%{http_code}' \
  "$URL/health")

# GET preflight
PREFLIGHT_GET=$(curl -s \
  -o /dev/null \
  -w '%{http_code}' \
  -X OPTIONS \
  "$URL/c/cycu/buildings" \
  -H 'Origin: http://localhost:8099' \
  -H 'Access-Control-Request-Method: GET' \
  -H 'Access-Control-Request-Headers: content-type')

# DELETE preflight
PREFLIGHT_DELETE=$(curl -s \
  -o /dev/null \
  -w '%{http_code}' \
  -X OPTIONS \
  "$URL/c/cycu/activities/test-activity" \
  -H 'Origin: https://main.d2en9gqqhr4tea.amplifyapp.com' \
  -H 'Access-Control-Request-Method: DELETE' \
  -H 'Access-Control-Request-Headers: content-type')

# Check CORS header for DELETE.
CORS_DELETE=$(curl -sI \
  -X OPTIONS \
  "$URL/c/cycu/activities/test-activity" \
  -H 'Origin: https://main.d2en9gqqhr4tea.amplifyapp.com' \
  -H 'Access-Control-Request-Method: DELETE' \
  -H 'Access-Control-Request-Headers: content-type' \
  | grep -ci 'access-control-allow-origin' || true)

echo
echo "  API             $URL"
echo "  /health         HTTP $CODE"
echo "  GET preflight   HTTP $PREFLIGHT_GET"
echo "  DELETE preflight HTTP $PREFLIGHT_DELETE"

if [ "$PREFLIGHT_GET" = "204" ] &&
   [ "$PREFLIGHT_DELETE" = "204" ] &&
   [ "$CORS_DELETE" -gt 0 ]; then

  echo "  CORS            GET + DELETE preflight passes ?"

else

  echo "  CORS            FAILS ? ¡X browser requests may be blocked"

fi

echo
echo "  Next: set API_BASE in src/api.js to"
echo "        $URL"
echo
echo "  Then: node infra/seed.js   (loads buildings, items and places)"